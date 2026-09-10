import React, { useState } from 'react';
import { StyleSheet, View, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

import { detect, INPUT_SIZE } from '../lib/detect';
import { pixelsFromBase64Jpeg } from '../lib/decodeImage';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Typography from '../components/Typography';
import StatusView from '../components/StatusView';
import { spacing } from '../theme/tokens';

const SKETCHES_DIR = `${FileSystem.documentDirectory}sketches/`;

// ImagePicker's returned uri is a cache path the OS can reclaim - copying it
// into documentDirectory makes it the durable, offline-safe copy the rest of
// the app (reviewDetections, sketchProfile, the sketch list) reads from,
// independent of whether/when it's ever uploaded to R2.
async function persistLocally(uri, sketchId) {
  await FileSystem.makeDirectoryAsync(SKETCHES_DIR, { intermediates: true }).catch(() => {});
  const dest = `${SKETCHES_DIR}${sketchId}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

// Capture screen: photo -> on-device TFLite detection, all in memory, no
// network required. Hands raw predictions to ReviewDetections for tap-to-correct
// before sort/codegen/sync happens there - keeps this screen just "get boxes".
export default function Landing({ route }) {
  const { sketchId, sname } = route.params;
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const navigation = useNavigation();

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || galleryPermission.status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to grant camera and gallery permissions.');
      return false;
    }
    return true;
  };

  // No allowsEditing/aspect crop here on purpose: the model (model/verify_tflite.py)
  // was trained/evaluated on a direct resize of the full original photo straight to
  // INPUT_SIZE, with no pre-crop. Forcing a 10:16 crop here reframed the sketch before
  // the model ever saw it - a real mismatch from the Python pipeline, confirmed by the
  // held-out eval image IMG_20190308_205452.jpg (AP50=1.0 in Python) barely detecting
  // anything on-device until this was removed.
  const takePicture = async () => {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;
    const result = await ImagePicker.launchCameraAsync();
    handleImagePicked(result);
  };

  const chooseFromGallery = async () => {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) return;
    const result = await ImagePicker.launchImageLibraryAsync();
    handleImagePicked(result);
  };

  const handleImagePicked = async (pickerResult) => {
    try {
      setUploading(true);
      if (pickerResult.cancelled || !pickerResult.assets || pickerResult.assets.length === 0) return;

      const { uri, width: originalWidth, height: originalHeight } = pickerResult.assets[0];
      if (typeof uri !== 'string') {
        console.error('Invalid URI:', uri);
        return;
      }

      const localUri = await persistLocally(uri, sketchId);

      setStatusText('Detecting elements...');
      const detectionInput = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
        { compress: 1, format: 'jpeg', base64: true }
      );
      const pixelData = pixelsFromBase64Jpeg(detectionInput.base64, INPUT_SIZE, INPUT_SIZE);
      const predictions = await detect(pixelData, originalWidth, originalHeight);

      navigation.navigate('ReviewDetections', {
        sketchId,
        sname,
        imageUri: localUri,
        predictions,
        width: originalWidth,
        height: originalHeight,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Detection failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      {uploading ? (
        <StatusView text={statusText} loading />
      ) : (
        <View style={styles.content}>
          <Typography.Body style={styles.infoText}>
            Bring your idea to life by drawing any of the following elements:
          </Typography.Body>
          <Image style={styles.infoImg} source={require('../assets/guidelines.png')} />
          <View style={styles.buttonsContainer}>
            <Button style={styles.button} onPress={takePicture}>Take picture</Button>
            <Button style={styles.button} onPress={chooseFromGallery}>Upload picture</Button>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  button: {
    flex: 1,
    minWidth: 150,
    marginHorizontal: spacing.sm,
  },
  infoText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoImg: {
    width: 350,
    height: 420,
    margin: spacing.xl,
  },
});
