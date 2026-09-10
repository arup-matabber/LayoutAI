import React from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, BackHandler } from 'react-native';
import { genId, saveLocal } from '../lib/localStore';
import { enqueuePush } from '../lib/sync';
import Screen from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Typography from '../components/Typography';
import { spacing } from '../theme/tokens';

export default class Sketch extends React.Component {
  state = {
    name: '',
    message: ''
  };

  componentDidMount() {
    // Handle hardware back press on Android devices
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      this.goBack(); // Go back to the list of sketches
      return true;
    });
  }

  componentWillUnmount() {
    this.backHandler.remove(); // Clean up back handler when the component unmounts
  }

  goBack() {
    this.props.navigation.navigate('ListSketches');
  }

  // Creates the sketch entirely on-device (localStore is the source of
  // truth - see lib/localStore.js) and queues a background push to the
  // server. No network needed to get started; sync.js retries the push
  // whenever a connection shows up.
  createSketch = async () => {
    let { name } = this.state;
    name = name.replace(/ /g, "_");

    if (name === "") {
      this.setState({ message: 'Incomplete fields' });
      return;
    }

    try {
      const id = genId();
      const sketch = await saveLocal(id, { name });
      enqueuePush(id);
      this.props.navigation.navigate('Landing', { sketchId: sketch._id, sname: sketch.name });
    } catch (error) {
      console.error("Error creating sketch: ", error);
      this.setState({ message: 'Error creating sketch' });
    }
  };

  render() {
    return (
      <Screen>
        <KeyboardAvoidingView behavior="padding" style={styles.container}>
          <View style={styles.formContainer}>
            <Image style={styles.infoImg} source={require('../assets/idea.png')} />
            <TextField
              style={styles.input}
              underlineColorAndroid="rgba(0,0,0,0)"
              placeholder="Sketch Name"
              onChangeText={(text) => this.setState({ name: text })}
            />
            {this.state.message ? <Typography.ErrorText>{this.state.message}</Typography.ErrorText> : null}
            <Button style={styles.button} onPress={this.createSketch}>Create Sketch</Button>
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
  },
  formContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: 300,
  },
  button: {
    width: 300,
    marginVertical: spacing.sm,
  },
  infoImg: {
    width: 150,
    height: 150,
    margin: spacing.lg,
  },
});
