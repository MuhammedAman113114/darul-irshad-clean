import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {PaperProvider} from 'react-native-paper';
import {AuthProvider} from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import NamazScreen from './screens/NamazScreen';
import LeaveScreen from './screens/LeaveScreen';
import StudentsScreen from './screens/StudentsScreen';
import {theme} from './theme/theme';

const Stack = createStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Login"
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'Darul Irshad' }}
              />
              <Stack.Screen 
                name="Attendance" 
                component={AttendanceScreen}
                options={{ title: 'Attendance Management' }}
              />
              <Stack.Screen 
                name="Namaz" 
                component={NamazScreen}
                options={{ title: 'Namaz Tracking' }}
              />
              <Stack.Screen 
                name="Leave" 
                component={LeaveScreen}
                options={{ title: 'Leave Management' }}
              />
              <Stack.Screen 
                name="Students" 
                component={StudentsScreen}
                options={{ title: 'Student Management' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

export default App;