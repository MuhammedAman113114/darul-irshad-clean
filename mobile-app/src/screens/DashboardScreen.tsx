import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import {theme} from '../theme/theme';

const DashboardScreen = ({navigation}: any) => {
  const {user, logout} = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Attendance Management',
      description: 'Take attendance, view sheets, manage missed sections',
      icon: 'clipboard-check-outline',
      color: '#059669',
      screen: 'Attendance',
    },
    {
      title: 'Namaz Tracking',
      description: 'Track daily prayer attendance',
      icon: 'mosque',
      color: '#7C3AED',
      screen: 'Namaz',
    },
    {
      title: 'Leave Management',
      description: 'Manage student leave requests',
      icon: 'calendar-remove',
      color: '#DC2626',
      screen: 'Leave',
    },
    {
      title: 'Student Management',
      description: 'View and manage student profiles',
      icon: 'account-group',
      color: '#2563EB',
      screen: 'Students',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <View style={styles.welcomeContent}>
              <View>
                <Text variant="headlineSmall" style={styles.welcomeText}>
                  Welcome back!
                </Text>
                <Text variant="bodyLarge" style={styles.userName}>
                  {user?.name}
                </Text>
                <Text variant="bodyMedium" style={styles.userRole}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={handleLogout}
                style={styles.logoutButton}
                textColor={theme.colors.error}
                buttonColor="#fff">
                Logout
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.menuContainer}>
        <Text variant="titleLarge" style={styles.menuTitle}>
          Management Modules
        </Text>

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}>
            <Card style={styles.menuCard}>
              <Card.Content>
                <View style={styles.menuItemContent}>
                  <View style={[styles.iconContainer, {backgroundColor: item.color}]}>
                    <Icon name={item.icon} size={28} color="#fff" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text variant="titleMedium" style={styles.menuItemTitle}>
                      {item.title}
                    </Text>
                    <Text variant="bodyMedium" style={styles.menuItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={theme.colors.outline} />
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          Darul Irshad Student Management System v1.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  userName: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  userRole: {
    color: theme.colors.outline,
    marginTop: 2,
  },
  logoutButton: {
    borderColor: theme.colors.error,
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  menuContainer: {
    padding: 16,
  },
  menuTitle: {
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  menuCard: {
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    color: theme.colors.outline,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.outline,
    textAlign: 'center',
  },
});

export default DashboardScreen;