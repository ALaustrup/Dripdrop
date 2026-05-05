import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.subtitle}>
            {this.state.errorMessage || 'Unexpected rendering error in DripDrop.'}
          </Text>
          <Pressable onPress={this.handleReset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#041326',
  },
  title: {
    color: '#f7fbff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8fb3d4',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 8,
    backgroundColor: '#2c9be6',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
