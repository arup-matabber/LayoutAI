import React from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import Typography from './Typography';
import { colors, spacing } from '../theme/tokens';

// The "centered image + message + optional spinner" pattern repeated in
// landing.js's uploading state and sketchProfile.js's loading/empty states.
export default function StatusView({ image, text, loading, children }) {
  return (
    <View style={styles.container}>
      {image ? <Image style={styles.image} source={image} resizeMode="contain" /> : null}
      {text ? <Typography.Body style={styles.text}>{text}</Typography.Body> : null}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
  },
  text: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  spinner: {
    marginTop: spacing.sm,
  },
});
