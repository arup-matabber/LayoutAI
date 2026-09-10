import React, { Component } from 'react';
import { StyleSheet, View, Dimensions, BackHandler } from 'react-native';
import ScalableImage from 'react-native-scalable-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api/client';
import { getLocal, saveLocal, mergeFromServer } from '../lib/localStore';
import Screen from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Typography from '../components/Typography';
import StatusView from '../components/StatusView';
import { spacing } from '../theme/tokens';

// Detection now completes synchronously on-device (landing.js), so this screen
// no longer polls Firestore waiting for a Cloud Function - it either receives
// the result directly via route.params (fresh capture) or fetches the saved
// doc once (reopening an older sketch from history). The "Enhance" step is the
// only thing that still touches the network here, and it's non-blocking: it
// fires in the background, times out fast, and fails silently if offline.
export default class SketchProfile extends Component {
  state = {
    isLoading: false,
    isEmpty: false,
    imageUri: '',
    predictions: [],
    width: 0,
    height: 0,
    code: '',
    enhancedCode: '',
    enhancedTheme: null,
    enhancedLabels: null,
    enhancing: false,
    enhanceError: '',
    styleInstruction: '',
  };

  componentDidMount() {
    const { sketchId, predictions, imageUri, width, height, code } = this.props.route.params;

    if (predictions) {
      this.setState({ imageUri, predictions, width, height, code, isEmpty: predictions.length === 0 });
      this.maybeEnhance(sketchId);
    } else {
      this.loadSketch(sketchId);
    }

    this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      this.goBack();
      return true;
    });
  }

  componentWillUnmount() {
    if (this.backHandler) this.backHandler.remove();
  }

  // Reopening a sketch (from the list, or a deep link) - localStore is
  // checked first so this works offline for anything ever created or synced
  // on this device. The server is only consulted for a sketch this device
  // has never seen (e.g. synced from elsewhere), and the result is cached
  // locally so the next open is offline-safe too.
  loadSketch = async (sketchId) => {
    this.setState({ isLoading: true });

    const local = await getLocal(sketchId);
    if (local) {
      this.setState({
        imageUri: local.image_url,
        predictions: local.predictions,
        width: local.width,
        height: local.height,
        code: local.code,
        enhancedCode: local.enhanced_code,
        enhancedTheme: local.enhanced_theme,
        enhancedLabels: local.enhanced_labels,
        isEmpty: local.predictions.length === 0,
        isLoading: false,
      });
      if (!local.enhanced_code) this.maybeEnhance(sketchId);
      return;
    }

    try {
      const sketch = await api.getSketch(sketchId);
      await mergeFromServer(sketch);
      this.setState({
        imageUri: sketch.image_url,
        predictions: sketch.predictions,
        width: sketch.width,
        height: sketch.height,
        code: sketch.code,
        enhancedCode: sketch.enhanced_code,
        enhancedTheme: sketch.enhanced_theme,
        enhancedLabels: sketch.enhanced_labels,
        isEmpty: sketch.predictions.length === 0,
        isLoading: false,
      });
      if (!sketch.enhanced_code) this.maybeEnhance(sketchId);
    } catch (err) {
      console.error(err);
      this.setState({ isLoading: false, isEmpty: true });
    }
  };

  // instruction: optional free-text styling direction ("more minimalist", "dark
  // mode") from the input in render(). Plain calls (no instruction) use the
  // AsyncStorage cache and skip a repeat network call; an instruction always
  // re-runs, since the user is explicitly asking for a different result.
  // userInitiated: true only when triggered by the "Go" button (restyle()) -
  // that call should tell the user *something* on failure. The automatic
  // background call on screen load stays silent by design (see class comment)
  // so a bare offline reopen doesn't greet the user with an error.
  maybeEnhance = async (sketchId, instruction, { userInitiated = false } = {}) => {
    if (userInitiated) this.setState({ enhanceError: '' });

    const cacheKey = `enhance:${sketchId}`;
    if (!instruction) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        // Older cache entries (pre theme/labels) are a bare code string, not
        // JSON - fall back to treating them as offline-theme code rather than
        // crashing on JSON.parse.
        try {
          const { code: enhancedCode, theme, labels } = JSON.parse(cached);
          this.setState({ enhancedCode, enhancedTheme: theme, enhancedLabels: labels });
        } catch {
          this.setState({ enhancedCode: cached });
        }
        return;
      }
    }

    // /enhance is keyed by the server's Mongo _id, not the client-generated
    // local id (sketchId here) - sending the local id crashed the server
    // (Sketch.findOne({_id: <non-ObjectId>}) threw outside any try/catch).
    // Until this sketch has synced (image + predictions on R2/Mongo), there's
    // nothing for Gemini to read anyway, so skip rather than guess.
    const local = await getLocal(sketchId);
    const serverId = local?.serverId;
    if (!serverId) {
      if (userInitiated) this.setState({ enhanceError: "Still syncing to the server - try again in a moment." });
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      if (userInitiated) this.setState({ enhanceError: "You're offline - can't enhance right now." });
      return; // offline is a normal path, not an error
    }

    this.setState({ enhancing: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const { enhanced_code, theme, labels } = await api.enhance(serverId, { signal: controller.signal, instruction });
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ code: enhanced_code, theme, labels }));
      // best-effort - sketch may not be local yet if it's mid-sync
      await saveLocal(sketchId, { enhanced_code, enhanced_theme: theme, enhanced_labels: labels }).catch(() => {});
      this.setState({ enhancedCode: enhanced_code, enhancedTheme: theme, enhancedLabels: labels });
    } catch (err) {
      console.warn('enhance skipped (offline/slow/failed, keeping local result):', err.message);
      if (userInitiated) {
        this.setState({ enhanceError: err.name === 'AbortError' ? 'Enhance timed out - try again.' : err.message });
      }
    } finally {
      clearTimeout(timeout);
      this.setState({ enhancing: false });
    }
  };

  restyle = () => {
    const { sketchId } = this.props.route.params;
    this.maybeEnhance(sketchId, this.state.styleInstruction.trim(), { userInitiated: true });
  };

  goBack() {
    this.props.navigation.navigate('ListSketches');
  }

  displayLayout = () => {
    const { predictions, width, height, enhancedCode, enhancedTheme, enhancedLabels } = this.state;
    this.props.navigation.navigate('DisplayLayout', {
      predictions,
      width,
      height,
      enhancedCode,
      theme: enhancedTheme,
      labels: enhancedLabels,
    });
  };

  displayCode = () => {
    const { code, enhancedCode } = this.state;
    const { sname } = this.props.route.params;
    this.props.navigation.navigate('DisplaySourceCode', { sname, code, enhancedCode });
  };

  render() {
    const { isLoading, isEmpty, imageUri, code, enhancing, enhancedCode, enhanceError, styleInstruction } = this.state;

    return (
      <Screen>
        {isLoading ? (
          <StatusView image={require('../assets/ml.png')} text="Please wait while your sketch is being processed." loading />
        ) : isEmpty ? (
          <StatusView image={require('../assets/no_predictions.png')} text="No results found" />
        ) : (
          <View style={styles.content}>
            <ScalableImage
              width={Dimensions.get('window').width + 50}
              height={Dimensions.get('window').height - 320}
              source={{ uri: imageUri }}
            />
            {enhancing ? <Typography.Body style={styles.infoText}>Enhancing...</Typography.Body> : null}
            {enhanceError ? <Typography.ErrorText style={styles.errorText}>{enhanceError}</Typography.ErrorText> : null}
            {enhancedCode ? <Typography.Body style={styles.infoText}>Enhanced ✨</Typography.Body> : null}
            <View style={styles.restyleRow}>
              <TextField
                style={styles.restyleInput}
                placeholder="Style direction (e.g. dark mode, minimalist)"
                value={styleInstruction}
                onChangeText={(text) => this.setState({ styleInstruction: text })}
              />
              <Button style={styles.restyleButton} onPress={this.restyle} disabled={enhancing}>Go</Button>
            </View>
            <Button style={styles.button} onPress={this.displayLayout}>Show Layout</Button>
            {code ? (
              <Button style={styles.button} onPress={this.displayCode}>Show Source Code</Button>
            ) : (
              <Typography.Caption>No code available</Typography.Caption>
            )}
          </View>
        )}
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: 300,
    marginVertical: spacing.xs,
  },
  infoText: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  restyleRow: {
    flexDirection: 'row',
    width: 300,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  restyleInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  restyleButton: {
    paddingHorizontal: spacing.md,
  },
});
