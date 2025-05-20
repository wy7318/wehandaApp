import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, Restaurant, UserRestaurant } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type RestaurantContextType = {
  userRestaurants: UserRestaurant[];
  selectedRestaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  fetchUserRestaurants: () => Promise<void>;
  selectRestaurant: (restaurant: Restaurant) => void;
};

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRestaurants, setUserRestaurants] = useState<UserRestaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch user's restaurants
  const fetchUserRestaurants = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user_restaurants with joined restaurant data
      const { data, error } = await supabase
        .from('user_restaurants')
        .select(`
          id,
          user_id,
          restaurant_id,
          role,
          created_at,
          updated_at,
          restaurants:restaurant_id (
            id,
            name,
            address,
            created_date,
            modified_date
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: UserRestaurant[] = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        restaurant_id: item.restaurant_id,
        role: item.role,
        created_at: item.created_at,
        updated_at: item.updated_at,
        restaurant: item.restaurants
      }));
      
      setUserRestaurants(transformedData);
      
      // Set the first restaurant as selected if available and none is currently selected
      if (transformedData.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(transformedData[0].restaurant!);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurants when user changes
  useEffect(() => {
    if (user) {
      fetchUserRestaurants();
    } else {
      setUserRestaurants([]);
      setSelectedRestaurant(null);
    }
  }, [user]);

  // Select a restaurant
  const selectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const value = {
    userRestaurants,
    selectedRestaurant,
    loading,
    error,
    fetchUserRestaurants,
    selectRestaurant,
  };

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};