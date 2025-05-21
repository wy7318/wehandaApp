// Update the function call in fetchCustomers()
const fetchCustomers = async () => {
    try {
      const restaurantId = String(id).trim();
      const { data, error } = await supabase
        .rpc('fetch_restaurant_customer_analytics', { restaurant_id: restaurantId });
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };