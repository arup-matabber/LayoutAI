import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './pages/login';
import Singup from './pages/singup';
import Landing from './pages/landing';
import ReviewDetections from './pages/reviewDetections';
import Sketch from './pages/Sketch';
import ListSketches from './pages/displaySketches1';
import SketchProfile from './pages/sketchProfile';
import DisplayLayout from './pages/displayLayout';
import DisplaySourceCode from './pages/displaySourceCode';

import * as Font from 'expo-font';
import { api } from './api/client';
import { colors, typography, shadow } from './theme/tokens';

const Stack = createStackNavigator();

// Screens no longer take a `db`/`email` initialParam - identity lives in the
// JWT session (api/client.js), not threaded through route params.
export default class Routes extends Component {
  state = {
    fontLoaded: false,
    // Resolved once at boot from the stored token (api.isLoggedIn) - no
    // network call, so a returning user isn't forced through Login every
    // launch (and isn't locked out of a valid session just because they're
    // offline at that moment).
    initialRoute: null,
  };

  async componentDidMount() {
    const [, loggedIn] = await Promise.all([
      Font.loadAsync({ 'System-code': require('./assets/fonts/code-regular.ttf') }),
      api.isLoggedIn(),
    ]);
    this.setState({ fontLoaded: true, initialRoute: loggedIn ? 'ListSketches' : 'Login' });
  }

  render() {
    if (!this.state.fontLoaded || !this.state.initialRoute) {
      return null;
    }

    return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={this.state.initialRoute}
          screenOptions={{
            headerStyle: styles.header,
            headerTitleStyle: styles.navTitle,
            headerTintColor: colors.textOnPrimary,
          }}
        >
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ title: 'Login', headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={Singup}
          />
          <Stack.Screen
            name="Sketch"
            component={Sketch}
            options={{ title: 'New Sketch' }}
          />
          <Stack.Screen
            name="ListSketches"
            component={ListSketches}
            options={{ title: 'Sketches', headerLeft: () => null }}
          />
          <Stack.Screen
            name="Landing"
            component={Landing}
          />
          <Stack.Screen
            name="ReviewDetections"
            component={ReviewDetections}
            options={{ title: 'Review' }}
          />
          <Stack.Screen
            name="SketchProfile"
            component={SketchProfile}
            options={{ title: 'Sketch Results' }}
          />
          <Stack.Screen
            name="DisplayLayout"
            component={DisplayLayout}
            options={{ title: 'Layout' }}
          />
          <Stack.Screen
            name="DisplaySourceCode"
            component={DisplaySourceCode}
            options={{ title: 'Source Code' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
}

const styles = StyleSheet.create({
  // Brand green instead of a generic white/gray bar - matches the primary
  // color used everywhere else in the app (buttons, spinners, accents), so
  // the header reads as intentional rather than a leftover default.
  header: {
    backgroundColor: colors.primary,
    ...shadow.header,
  },
  navTitle: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
});
