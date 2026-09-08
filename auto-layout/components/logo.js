import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

export default class Logo extends React.Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.logoText}>&lt;auto layout/&gt;</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.md,
  },
  logoText: {
    ...typography.brand,
    fontSize: 56,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
