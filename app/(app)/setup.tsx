import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Header } from '@/components/app/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, UserPlus } from 'lucide-react-native';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
}

export default function SetupScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [searchRestaurant, setSearchRestaurant] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);

  const searchUsers = async () => {
    if (!searchUser.trim()) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-users?search=${encodeURIComponent(searchUser)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search users');
      }

      const matchedUsers = await response.json();
      setUsers(matchedUsers);
    } catch (error: any) {
      console.error('Error searching users:', error);
      Alert.alert('Error', error.message);
    }
  };

  const searchRestaurants = async () => {
    if (!searchRestaurant.trim()) return;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name', `%${searchRestaurant}%`);

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      Alert.alert('Error', 'Failed to search restaurants');
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedUser || !selectedRestaurant) {
      Alert.alert('Error', 'Please select both user and restaurant');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_restaurants')
        .insert({
          user_id: selectedUser.id,
          restaurant_id: selectedRestaurant.id,
          role: role
        });

      if (error) throw error;

      Alert.alert('Success', 'User-restaurant mapping created successfully');
      setSelectedUser(null);
      setSelectedRestaurant(null);
      setRole('staff');
      setUsers([]);
      setRestaurants([]);
      setSearchUser('');
      setSearchRestaurant('');
    } catch (error: any) {
      console.error('Error creating mapping:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <Text style={styles.title}>Restaurant Setup</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search User</Text>
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search by email or name"
              value={searchUser}
              onChangeText={setSearchUser}
              leftIcon={<Search size={20} color={Colors.neutral[500]} />}
            />
            <Button
              title="Search"
              onPress={searchUsers}
              style={styles.searchButton}
            />
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  selectedUser?.id === item.id && styles.selectedItem
                ]}
                onPress={() => setSelectedUser(item)}
              >
                <Text style={styles.itemTitle}>{item.full_name || 'No name'}</Text>
                <Text style={styles.itemSubtitle}>{item.email}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Restaurant</Text>
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search by name"
              value={searchRestaurant}
              onChangeText={setSearchRestaurant}
              leftIcon={<Search size={20} color={Colors.neutral[500]} />}
            />
            <Button
              title="Search"
              onPress={searchRestaurants}
              style={styles.searchButton}
            />
          </View>

          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  selectedRestaurant?.id === item.id && styles.selectedItem
                ]}
                onPress={() => setSelectedRestaurant(item)}
              >
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.address}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role</Text>
          <View style={styles.roleContainer}>
            {['owner', 'manager', 'staff'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleButton,
                  role === r && styles.selectedRole
                ]}
                onPress={() => setRole(r)}
              >
                <Text style={[
                  styles.roleText,
                  role === r && styles.selectedRoleText
                ]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Create Mapping"
          onPress={handleCreateMapping}
          isLoading={loading}
          leftIcon={<UserPlus size={20} color={Colors.white} />}
          style={styles.createButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: Colors.neutral[800],
    marginBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchButton: {
    minWidth: 100,
  },
  list: {
    maxHeight: 200,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  listItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  selectedItem: {
    backgroundColor: Colors.primary[50],
  },
  itemTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: Colors.neutral[900],
  },
  itemSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: Colors.neutral[600],
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
  },
  selectedRole: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  roleText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: Colors.neutral[700],
  },
  selectedRoleText: {
    color: Colors.white,
  },
  createButton: {
    marginTop: Spacing.lg,
  },
});