import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const webhookData = await req.json();
    
    // Log raw webhook data
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        payload: webhookData,
        processed: false
      });
    
    if (logError) throw logError;

    // Handle restaurant data
    const restaurant = webhookData;
    const { error: restaurantError } = await supabaseClient
      .from('restaurants')
      .upsert({
        id: restaurant.restaurant_id,
        name: restaurant.restaurant_name,
        address: restaurant.restaurant_address,
        created_date: new Date().toISOString(),
        modified_date: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (restaurantError) throw restaurantError;

    // Handle customer data
    const customer = webhookData.data.customer;
    const { error: customerError } = await supabaseClient
      .from('wehanda_customers')
      .upsert({
        id: customer._id,
        organisation_id: customer.organisation_id,
        name: customer.details?.name || customer.name, // Handle both order and booking customer formats
        phone: customer.details?.phone || customer.phone,
        email: customer.details?.email || customer.email,
        zip: customer.zip || '',
        ip: customer.meta?.last_ip,
        country: customer.meta?.ip_country,
        region: customer.meta?.ip_region,
        city: customer.meta?.ip_city,
        lat: customer.meta?.ip_lat,
        lng: customer.meta?.ip_lng,
        first_name: (customer.details?.name || customer.name || '').split(' ')[0],
        last_name: (customer.details?.name || customer.name || '').split(' ').slice(1).join(' '),
        type: customer.type,
        avatar: customer.avatar,
        manual: customer.manual,
        verified: customer.verified,
        gender: customer.details?.gender,
        age_range: customer.details?.age_range,
        meta: customer.meta,
        stats: customer.stats,
        restaurants: customer.restaurants,
        age_verification: customer.age_verification,
        created_date: new Date().toISOString(),
        modified_date: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (customerError) throw customerError;

    // Handle different webhook types
    if (webhookData.event === 'booking_new') {
      const booking = webhookData.data.booking;
      const { error: bookingError } = await supabaseClient
        .from('bookings')
        .upsert({
          id: booking._id,
          restaurant_id: restaurant.restaurant_id,
          customer_id: customer._id,
          status: booking.status,
          notes: booking.notes,
          number: booking.number,
          web_url: booking.web_url,
          date: booking.config.date,
          time: booking.config.time,
          timestamp: booking.config.timestamp,
          number_of_people: booking.config.number_of_people,
          created_date: new Date(booking.created).toISOString(),
          modified_date: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (bookingError) throw bookingError;

      // Update webhook log
      await supabaseClient
        .from('webhook_logs')
        .update({
          processed: true,
          modified_date: new Date().toISOString()
        })
        .eq('payload->data->booking->_id', booking._id);

    } else if (webhookData.data.order) {
      // Existing order handling code...
      const order = webhookData.data.order;
      
      // Insert/update order
      const { data: orderData, error: orderError } = await supabaseClient
        .from('orders')
        .upsert({
          id: order._id,
          restaurant_id: restaurant.restaurant_id,
          customer_id: customer._id,
          order_type: webhookData.order_type,
          status: order.status,
          notes: order.notes,
          number: order.number,
          timezone: order.timezone,
          web_url: order.web_url,
          total: order.bill.total,
          cart: order.bill.cart,
          discount: order.bill.discount || 0,
          tip: order.bill.tip || 0,
          payment_method: order.payment?.method,
          payment_status: order.payment?.status,
          payment_total: order.payment?.total,
          ready_in: order.ready_in?.timestamp ? new Date(order.ready_in.timestamp).toISOString() : null,
          delivery_in: order.delivery_in,
          rush_eta_increment: order.rush_eta_increment || 0,
          wpos_order: order.wpos_order || false,
          kounta_order: order.kounta_order || false,
          abacus_order: order.abacus_order || false,
          auto_printed: order.auto_printed || [],
          created_date: new Date(order.created).toISOString(),
          modified_date: new Date().toISOString()
        }, {
          onConflict: 'id',
          returning: true
        });
      
      if (orderError) throw orderError;

      // Handle order config
      if (order.config) {
        const { error: configError } = await supabaseClient
          .from('order_config')
          .upsert({
            order_id: order._id,
            due: order.config.due,
            lat: order.config.lat,
            lng: order.config.lng,
            date: order.config.date,
            time: order.config.time,
            zone: order.config.zone,
            table_info: order.config.table,
            source: order.config.source,
            service: order.config.service,
            distance: order.config.distance,
            is_limit: order.config.is_limit,
            confirmed: order.config.confirmed,
            destination: order.config.destination,
            driving_time: order.config.driving_time,
            destination_misc: order.config.destination_misc,
            number_of_people: order.config.number_of_people
          }, {
            onConflict: 'order_id'
          });
        
        if (configError) {
          console.error('Error inserting order config:', configError);
        }
      }

      // Handle checkout fields
      if (order.checkout_fields?.length > 0) {
        const checkoutFieldPromises = order.checkout_fields.map((field) =>
          supabaseClient
            .from('order_checkout_fields')
            .upsert({
              order_id: order._id,
              field_id: field.id,
              field_type: field.type,
              question_label: field.question?.label,
              question_description: field.question?.description,
              answer: field.answer
            }, {
              onConflict: ['order_id', 'field_id']
            })
        );
        
        await Promise.all(checkoutFieldPromises);
      }

      // Handle taxes
      if (order.bill?.taxes?.length > 0) {
        const taxPromises = order.bill.taxes.map((tax) =>
          supabaseClient
            .from('taxes')
            .upsert({
              id: tax._id,
              order_id: order._id,
              name: tax.name,
              rate: tax.rate,
              amount: tax.amount,
              created_date: new Date().toISOString(),
              modified_date: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
        );
        
        await Promise.all(taxPromises);
      }

      // Handle dishes and options
      if (order.dishes?.length > 0) {
        for (const dish of order.dishes) {
          // Insert dish
          const { error: dishError } = await supabaseClient
            .from('dishes')
            .upsert({
              id: dish._id,
              order_id: order._id,
              name: dish.name,
              price: dish.price,
              quantity: dish.qty,
              notes: dish.notes || '',
              menu_id: dish.menu_id,
              subtitle: dish.subtitle,
              base_price: dish.base_price,
              price_type: dish.price_type,
              category_id: dish.category_id,
              display_name: dish.display_name,
              require_age_verification: dish.require_age_verification || false,
              line_id: dish.line_id,
              type: dish.type,
              tags: dish.tags || [],
              created_date: new Date().toISOString(),
              modified_date: new Date().toISOString()
            }, {
              onConflict: 'id'
            });
          
          if (dishError) {
            console.error('Error inserting dish:', dishError);
            continue;
          }

          // Handle ingredients
          if (dish.ingredients?.length > 0) {
            const ingredientPromises = dish.ingredients.map((ingredient) =>
              supabaseClient
                .from('dish_ingredients')
                .upsert({
                  dish_id: dish._id,
                  ingredient_id: ingredient._id,
                  name: ingredient.name,
                  active: ingredient.active
                }, {
                  onConflict: ['dish_id', 'ingredient_id']
                })
            );
            
            await Promise.all(ingredientPromises);
          }

          // Handle options
          if (dish.option_sets?.length > 0) {
            for (const optionSet of dish.option_sets) {
              if (optionSet.options?.length > 0) {
                const optionPromises = optionSet.options.map((option) =>
                  supabaseClient
                    .from('options')
                    .upsert({
                      id: option._id,
                      dish_id: dish._id,
                      option_set_id: optionSet._id,
                      name: option.name,
                      price: option.price || 0,
                      quantity: option.quantity || 1,
                      status: option.status,
                      conditions: optionSet.conditions || null,
                      display_name: optionSet.display_name,
                      using_points: optionSet.using_points || false,
                      variable_price_ref: optionSet.variable_price_ref,
                      inc_price_free_qty_promo: optionSet.inc_price_free_qty_promo || false,
                      created_date: new Date().toISOString(),
                      modified_date: new Date().toISOString()
                    }, {
                      onConflict: 'id'
                    })
                );
                
                await Promise.all(optionPromises);
              }
            }
          }
        }
      }

      // Update webhook log
      await supabaseClient
        .from('webhook_logs')
        .update({
          processed: true,
          modified_date: new Date().toISOString()
        })
        .eq('payload->data->order->_id', order._id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Log the error in webhook_logs
    try {
      const webhookData = await req.clone().json();
      const id = webhookData.data?.order?._id || webhookData.data?.booking?._id;
      
      if (id) {
        await supabaseClient
          .from('webhook_logs')
          .update({
            processed: false,
            error: error.message,
            modified_date: new Date().toISOString()
          })
          .eq('payload->data->order->_id', id)
          .eq('payload->data->booking->_id', id);
      }
    } catch (logError) {
      console.error('Error updating webhook log:', logError);
    }

    return new Response(JSON.stringify({ error: 'Error processing webhook' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});