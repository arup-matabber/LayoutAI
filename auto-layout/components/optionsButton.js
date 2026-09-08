import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllLocal } from '../lib/localStore';
import { enqueueDelete } from '../lib/sync';
import { spacing, colors } from '../theme/tokens';

// "Remove all sketches" menu button, wired into ListSketches' header (Routes.js).
// Clears localStore immediately (works offline) and queues a server delete
// for anything that had ever synced - see lib/sync.js.
export default class OptionsButton extends React.Component {
  show = () => {
    Alert.alert(
      'Remove all your Sketches?',
      'Are you sure you would like to completely remove all your sketches? You can tap and hold a sketch to remove it.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        { text: 'Yes, remove', onPress: () => this.removeAllSketches() },
      ],
      { cancelable: false },
    );
  };

  removeAllSketches = async () => {
    try {
      const synced = await clearAllLocal();
      for (const sketch of synced) await enqueueDelete(sketch._id, sketch.serverId);
      if (this.props.onDeleted) this.props.onDeleted();
    } catch (error) {
      console.error("Error removing sketches:", error);
    }
  };

  render() {
    return (
      <TouchableOpacity style={styles.button} onPress={this.show} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={22} color={colors.textOnPrimary} />
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  // No flexGrow here - headerRight sizes to its content; flexGrow was
  // stretching/misaligning this within the header slot instead of just
  // sitting centered next to the title.
  button: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
