import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { api } from '../api/client';
import Screen from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Typography from '../components/Typography';
import { colors, spacing } from '../theme/tokens';

export default class Login extends React.Component {
  state = {
    email: '',
    password: '',
    message: ''
  };

  loginUser = async () => {
    const { email, password } = this.state;

    if (email === '' || password === '') {
      this.setState({ message: 'Please fill out both fields' });
      return;
    }

    try {
      await api.login(email, password);
      this.props.navigation.navigate('ListSketches');
    } catch (error) {
      console.error('Login Error:', error.message);
      this.setState({ message: 'Incorrect email or password' });
    }
  };

  signup = () => {
    this.props.navigation.navigate('Signup');
  };

  render() {
    return (
      <Screen>
        <KeyboardAvoidingView style={styles.container} behavior="padding">
          <View style={styles.formContainer}>
            <TextField
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onChangeText={(text) => this.setState({ email: text })}
              value={this.state.email}
            />

            <TextField
              placeholder="Password"
              secureTextEntry={true}
              autoCapitalize="none"
              returnKeyType="go"
              onChangeText={(text) => this.setState({ password: text })}
              value={this.state.password}
            />

            {this.state.message ? <Typography.ErrorText style={styles.error}>{this.state.message}</Typography.ErrorText> : null}

            <Button style={styles.button} onPress={this.loginUser}>Login</Button>
          </View>

          <View style={styles.singupTextContent}>
            <Typography.Caption>Don't have an account yet?</Typography.Caption>
            <TouchableOpacity onPress={this.signup}>
              <Text style={styles.singupButton}>Signup</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  formContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '100%',
    marginVertical: spacing.sm,
  },
  error: {
    marginVertical: spacing.sm,
  },
  singupTextContent: {
    flexDirection: 'row',
    paddingBottom: spacing.lg,
  },
  singupButton: {
    color: colors.primary,
    fontSize: 16,
    marginLeft: spacing.xs,
  },
});
