import React, { useState } from 'react';
import { StyleSheet, View, Image, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { ELEMENT_TYPES } from '../lib/elementTypes';
import { sortIntoRows } from '../lib/layoutSort';
import { generateCode } from '../lib/codeGen';
import { saveLocal } from '../lib/localStore';
import { enqueuePush, enqueueCorrections } from '../lib/sync';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Typography from '../components/Typography';
import { colors, spacing, radii } from '../theme/tokens';

const BOX_COLORS = {
  Text: '#c0392b',
  Textfield: '#27ae60',
  Button: '#f1c40f',
  Image: '#2980b9',
  Switch: '#8e44ad',
};

// Sits between landing.js's raw on-device detection and everything downstream:
// lets the user tap a wrong box and cycle it to the right class before code
// gets generated. A 342-image model will misfire sometimes - this is the
// safety net, and it doubles as free labeled training data (see
// api.submitCorrections below / server's Correction model) for a future retrain.
export default function ReviewDetections({ route }) {
  const { sketchId, sname, imageUri, predictions: initialPredictions, width: originalWidth, height: originalHeight } = route.params;
  const [predictions, setPredictions] = useState(initialPredictions);
  const [corrections, setCorrections] = useState([]); // { index, from, to, box }
  // Indices into `predictions` for boxes the user removed as spurious
  // detections - kept as a set of indices rather than splicing the array so
  // cycleClass/corrections (also indexed against initialPredictions) don't
  // need to be renumbered every time something's deleted.
  const [deletedIndices, setDeletedIndices] = useState(() => new Set());
  const navigation = useNavigation();

  const displayWidth = Dimensions.get('window').width;
  const scale = displayWidth / originalWidth;
  const displayHeight = originalHeight * scale;

  const cycleClass = (index) => {
    const original = initialPredictions[index];
    const currentType = predictions[index].object;
    const nextType = ELEMENT_TYPES[(ELEMENT_TYPES.indexOf(currentType) + 1) % ELEMENT_TYPES.length];

    setPredictions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], object: nextType };
      return next;
    });

    setCorrections((prev) => {
      const withoutThis = prev.filter((c) => c.index !== index);
      if (nextType === original.object) return withoutThis; // cycled back to what the model said - not a correction anymore
      return [...withoutThis, { index, from: original.object, to: nextType, box: original }];
    });
  };

  const deleteBox = (index) => {
    setDeletedIndices((prev) => new Set(prev).add(index));
  };

  const undoDeletes = () => setDeletedIndices(new Set());

  // Writes the finished sketch to localStore (source of truth, works
  // offline) and queues the server push instead of racing a single network
  // attempt - sync.js retries until it lands, so a sketch confirmed offline
  // isn't lost the way the old one-shot syncInBackground would lose it.
  const confirm = async () => {
    const activePredictions = predictions.filter((_, i) => !deletedIndices.has(i));
    const rows = sortIntoRows(activePredictions);
    const code = generateCode(rows, { name: sname });

    await saveLocal(sketchId, {
      image_url: imageUri,
      predictions: activePredictions,
      num_predictions: activePredictions.length,
      code,
      width: originalWidth,
      height: originalHeight,
    });
    enqueuePush(sketchId);

    // A deleted box's class correction (if any) no longer means anything -
    // the box itself was wrong, not just its label.
    const activeCorrections = corrections.filter((c) => !deletedIndices.has(c.index));
    if (activeCorrections.length > 0) {
      enqueueCorrections(
        sketchId,
        activeCorrections.map((c) => ({
          originalObject: c.from,
          correctedObject: c.to,
          x0: c.box.x0,
          y0: c.box.y0,
          x1: c.box.x1,
          y1: c.box.y1,
        }))
      );
    }

    navigation.navigate('SketchProfile', {
      sketchId,
      sname,
      imageUri,
      predictions: activePredictions,
      width: originalWidth,
      height: originalHeight,
      code,
    });
  };

  return (
    <Screen padded={false} center={false}>
      <Typography.Caption style={styles.instructions}>
        Tap a box to fix its type, tap × to remove a wrong detection
        {corrections.length > 0 ? ` (${corrections.length} corrected)` : ''}
      </Typography.Caption>
      {deletedIndices.size > 0 ? (
        <TouchableOpacity onPress={undoDeletes}>
          <Typography.Caption style={styles.undoText}>
            {deletedIndices.size} removed - Undo
          </Typography.Caption>
        </TouchableOpacity>
      ) : null}
      <ScrollView>
        <View style={{ width: displayWidth, height: displayHeight }}>
          <Image source={{ uri: imageUri }} style={{ width: displayWidth, height: displayHeight }} resizeMode="contain" />
          {predictions.map((p, i) => (
            deletedIndices.has(i) ? null : (
              // Boxes pop in one after another (small per-index stagger) instead
              // of all appearing at once - this is the "it actually saw my
              // sketch" moment, worth making feel alive.
              <Animated.View
                key={i}
                entering={FadeIn.delay(i * 70).duration(250)}
                style={{
                  position: 'absolute',
                  left: p.x0 * scale,
                  top: p.y0 * scale,
                  width: p.width * scale,
                  height: p.height * scale,
                }}
              >
                <TouchableOpacity
                  onPress={() => cycleClass(i)}
                  style={[styles.box, { borderColor: BOX_COLORS[p.object] || colors.background }]}
                >
                  <Text style={[styles.boxLabel, { backgroundColor: BOX_COLORS[p.object] || colors.textPrimary }]}>{p.object}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteBox(i)}
                  style={styles.deleteBadge}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={12} color={colors.textOnPrimary} />
                </TouchableOpacity>
              </Animated.View>
            )
          ))}
        </View>
      </ScrollView>
      <Button style={styles.confirmButton} onPress={confirm}>Looks good</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  instructions: {
    textAlign: 'center',
    padding: spacing.sm,
  },
  undoText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  box: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  deleteBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  boxLabel: {
    position: 'absolute',
    top: -18,
    left: -2,
    color: colors.textOnPrimary,
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm - 5,
  },
  confirmButton: {
    margin: spacing.md,
  },
});
