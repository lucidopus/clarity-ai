'use client';

import React, { Component, type ReactNode } from 'react';
import AnimationFallback from './AnimationFallback';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
}

export default class AnimationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[AnimationErrorBoundary]', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AnimationFallback
          title={this.props.title}
          description={this.props.description}
          reason="Animation failed to render. This may be due to browser compatibility."
        />
      );
    }

    return this.props.children;
  }
}
