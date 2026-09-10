import React, { Component } from 'react';
import { StyleSheet, Text, View, Image, Alert, Dimensions, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ImageLoad from 'react-native-image-placeholder';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api/client';
import { listLocal, removeLocal, mergeFromServer } from '../lib/localStore';
import { enqueueDelete } from '../lib/sync';
import OptionsButton from '../components/optionsButton';
import AnimatedPressable from '../components/AnimatedPressable';
import Screen from '../components/Screen';
import Button from '../components/Button';
import StatusView from '../components/StatusView';
import { colors, spacing, radii } from '../theme/tokens';

const resizeComponent = (value, percentage) => {
  return value - (value * (percentage / 100));
};

const Window = {
  Height: Dimensions.get('window').height,
  Width: Dimensions.get('window').width,
};

const CardContainerSize = {
  Height: resizeComponent(300, 5),
  Width: resizeComponent(Window.Width, 50),
};

class Container extends Component {
  render() {
    return (
      <View style={styles.container2}>
        {this.props.children}
      </View>
    );
  }
}

class Card extends Component {
  render() {
    // Staggered entrance (small per-index delay) instead of the whole grid
    // popping in at once - index comes from the .map() call site below.
    return (
      <Animated.View entering={FadeInDown.delay((this.props.index || 0) * 60).springify()}>
        <AnimatedPressable onPress={this.props.onPress} onLongPress={this.props.onLongPress}>
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              {this.props.children}
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }
}

// Local-first: localStore is always read first (instant, works offline);
// if online, the server list is fetched in the background and anything not
// already known on this device is merged in (covers reinstall / a second
// device). Refetches on focus rather than a live listener, matching the old
// Firestore onSnapshot -> fetch-on-focus migration this screen already went through.
export default class DisplaySketches1 extends React.Component {
  focusUnsubscribe = null;

  state = {
    sketches: [],
    isEmpty: false,
  };

  componentDidMount() {
    this.fetchSketches();
    this.focusUnsubscribe = this.props.navigation.addListener('focus', this.fetchSketches);
    this.props.navigation.setOptions({
      headerRight: () => <OptionsButton onDeleted={this.fetchSketches} />,
    });
  }

  componentWillUnmount() {
    if (this.focusUnsubscribe) this.focusUnsubscribe();
  }

  fetchSketches = async () => {
    const local = await listLocal();
    this.setState({ sketches: local, isEmpty: local.length === 0 });

    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    try {
      const remote = await api.listSketches();
      await Promise.all(remote.map((s) => mergeFromServer(s)));
      const merged = await listLocal();
      this.setState({ sketches: merged, isEmpty: merged.length === 0 });
    } catch (err) {
      console.error('Error fetching sketches from server (showing local list):', err);
    }
  };

  newSketch = () => {
    this.props.navigation.navigate('Sketch');
  };

  showDetails = (sketch) => {
    this.props.navigation.navigate('SketchProfile', { sketchId: sketch._id, sname: sketch.name });
  };

  confirmDelete = (sketch) => {
    Alert.alert(
      'Remove ' + sketch.name.replace(/_/g, " "),
      'Are you sure you want to delete this sketch?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        { text: 'OK', onPress: () => this.removeSketch(sketch) },
      ],
      { cancelable: false },
    );
  };

  removeSketch = async (sketch) => {
    await removeLocal(sketch._id);
    await enqueueDelete(sketch._id, sketch.serverId);
    this.fetchSketches();
  };

  render() {
    const { sketches, isEmpty } = this.state;

    return (
      <Screen padded={false} center={false}>
        {isEmpty ? (
          <StatusView image={require('../assets/no_results_found.png')}>
            <Button style={styles.button} onPress={this.newSketch}>Create Sketch</Button>
          </StatusView>
        ) : (
          <Container>
            <ScrollView>
              <View style={{ flexDirection: 'row', flex: 1, flexWrap: 'wrap' }}>
                {sketches.map((item, index) => (
                  <Card
                    key={item._id}
                    index={index}
                    onPress={() => this.showDetails(item)}
                    onLongPress={() => this.confirmDelete(item)}
                  >
                    <ImageLoad style={styles.image} loadingStyle={{ size: 'large', color: colors.primary }} source={{ uri: item.image_url }} />
                    <Text style={styles.title}>{item.name.replace(/_/g, " ")}</Text>
                  </Card>
                ))}
              </View>
            </ScrollView>
            <AnimatedPressable style={styles.fab} onPress={this.newSketch}>
              <Image source={require('../assets/plus.png')} style={styles.fabIcon} />
            </AnimatedPressable>
          </Container>
        )}
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  container2: {
    flex: 1,
    flexDirection: 'row',
  },
  button: {
    width: 300,
  },
  cardContainer: {
    height: 200,
    width: CardContainerSize.Width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    height: resizeComponent(200, 5),
    width: resizeComponent(CardContainerSize.Width, 5),
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  image: {
    width: resizeComponent(CardContainerSize.Width, 6),
    height: 151,
    resizeMode: 'stretch',
    borderRadius: radii.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    padding: spacing.sm,
    color: colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 64,
    shadowColor: 'rgba(0,0,0,.4)',
    shadowOffset: { height: 1, width: 1 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 4,
  },
  fabIcon: {
    resizeMode: 'contain',
    width: 30,
    height: 30,
  },
});
