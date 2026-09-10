import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Switch, Image, ScrollView } from 'react-native';
import { sortIntoRows } from '../lib/layoutSort';
import Screen from '../components/Screen';
import Typography from '../components/Typography';
import { colors, spacing, radii, shadow } from '../theme/tokens';

// Renders a live component preview from predictions - same row/col grouping
// the codegen path uses, rendered as real components instead of generated
// text. theme/labels are the exact same data enhance.js fed into
// codeGen.generateCode() to produce enhanced_code (see sketchProfile.js's
// displayLayout()), so toggling here mirrors displaySourceCode.js's
// Offline/Enhanced toggle instead of always showing generic placeholders.
function createUIElement(item, theme, labels) {
  const label = labels && item._idx !== undefined ? labels[item._idx] : undefined;
  const primaryColor = theme?.primaryColor || colors.primary;
  const borderRadius = theme?.borderRadius ?? radii.sm;

  switch (item.object) {
    case 'Textfield':
      return (
        <TextInput
          key={item._idx}
          style={[styles.input, { borderRadius }]}
          placeholder="Enter text here"
          placeholderTextColor={colors.textSecondary}
          underlineColorAndroid="transparent"
        />
      );
    case 'Text':
      return <Text key={item._idx} style={styles.label}>{label || 'Lorem Ipsum'}</Text>;
    case 'Button':
      return (
        <TouchableOpacity key={item._idx} style={[styles.button, { backgroundColor: primaryColor, borderRadius }]}>
          <Text style={styles.buttonText}>{label || 'Button'}</Text>
        </TouchableOpacity>
      );
    case 'Image':
      return <Image key={item._idx} style={[styles.img, { borderRadius }]} source={require('../assets/img-placeholder.png')} />;
    case 'Switch':
      return <Switch key={item._idx} style={styles.switch} thumbTintColor={primaryColor} />;
    default:
      return null;
  }
}

export default function DisplayLayout({ route }) {
  const { predictions = [], enhancedCode, theme, labels } = route.params;
  const [showEnhanced, setShowEnhanced] = useState(!!enhancedCode);

  // _idx attached before sorting so it survives sortIntoRows' reordering -
  // matches how enhance.js tags predictions before generating labels
  // server-side, so labels[item._idx] lines up with the right element here.
  const indexed = predictions.map((p, i) => ({ ...p, _idx: i }));
  const rows = sortIntoRows(indexed);
  const activeTheme = showEnhanced ? theme : null;
  const activeLabels = showEnhanced ? labels : null;

  return (
    <Screen padded={false} center={false} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {enhancedCode ? (
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleButton, !showEnhanced && styles.toggleButtonActive]} onPress={() => setShowEnhanced(false)}>
              <Text style={[styles.toggleText, !showEnhanced && styles.toggleTextActive]}>Offline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, showEnhanced && styles.toggleButtonActive]} onPress={() => setShowEnhanced(true)}>
              <Text style={[styles.toggleText, showEnhanced && styles.toggleTextActive]}>Enhanced ✨</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Typography.Caption style={styles.caption}>Live preview - generic placeholders until Enhanced</Typography.Caption>

        <View style={styles.card}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.rows}>
              {row.map((item) => createUIElement(item, activeTheme, activeLabels))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  toggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill - 5,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.textOnPrimary,
  },
  caption: {
    marginBottom: spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radii.md + 4,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.raised,
  },
  rows: {
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginVertical: spacing.xs + 2,
  },
  input: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    margin: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
  },
  button: {
    margin: spacing.xs + 2,
    height: 44,
    minWidth: 110,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.raised,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textOnPrimary,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  switch: {
    margin: spacing.sm,
  },
  img: {
    width: 100,
    height: 100,
    margin: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  label: {
    margin: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: 'Roboto',
  },
});
