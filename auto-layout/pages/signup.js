import React, { Component } from 'react';
import { Alert, StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Logo from '../components/logo';
import { api } from '../api/client';
import Screen from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Typography from '../components/Typography';
import { colors, spacing } from '../theme/tokens';

export default class Signup extends Component {
  state = {
    name: '',
    email: '',
    password: '',
    message: '',
  };

  createUser = async () => {
    const { name, email, password } = this.state;
    const { navigation } = this.props;

    if (name === "" || email === "" || password === "") {
      this.setState({ message: 'Please complete all fields.' });
      return;
    }

    try {
      await api.signup(email, password);
      Alert.alert('Thanks for signing up!', 'Registration completed.');
      navigation.navigate('ListSketches');
    } catch (error) {
      Alert.alert('Error', error.message);
      console.error(error);
    }
  };

  goBack = () => {
    this.props.navigation.goBack();
  };

  render() {
    return (
      <Screen>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Logo width={120} height={120} />
          <TextField
            style={styles.input}
            underlineColorAndroid="rgba(0,0,0,0)"
            placeholder="Name"
            selectionColor={colors.primary}
            autoCapitalize="none"
            onSubmitEditing={() => this.email.focus()}
            onChangeText={(text) => this.setState({ name: text })}
          />
          <TextField
            style={styles.input}
            underlineColorAndroid="rgba(0,0,0,0)"
            placeholder="Email"
            selectionColor={colors.primary}
            keyboardType="email-address"
            autoCapitalize="none"
            onSubmitEditing={() => this.password.focus()}
            ref={(input) => (this.email = input)}
            onChangeText={(text) => this.setState({ email: text })}
          />
          <TextField
            style={styles.input}
            underlineColorAndroid="rgba(0,0,0,0)"
            placeholder="Password"
            secureTextEntry={true}
            autoCapitalize="none"
            ref={(input) => (this.password = input)}
            onChangeText={(text) => this.setState({ password: text })}
          />
          {this.state.message ? <Typography.ErrorText>{this.state.message}</Typography.ErrorText> : null}
          <Button style={styles.button} onPress={this.createUser}>Sign Up</Button>
          <View style={styles.signupTextContent}>
            <Typography.Caption>Already have an account?</Typography.Caption>
            <TouchableOpacity onPress={this.goBack}>
              <Typography.Caption style={styles.signupButton}>Sign In</Typography.Caption>
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
  input: {
    width: 300,
  },
  signupTextContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: spacing.lg,
    flexDirection: 'row',
  },
  signupButton: {
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  button: {
    width: 300,
    marginVertical: spacing.sm,
  },
});
