import React from 'react';

import Oer from './containers/Oer';

// Generic error boundary wrapper to put around the OER component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) { 
    return { hasError: true };  
  }

  render() {
    if (this.state.hasError) { 
      return <h2 className="error">Something went wrong.</h2>;    
    }
    else return this.props.children; 
  }
}

class App extends React.Component {

  componentDidMount() {
    document.getElementById('loadingScreen').remove();
  }

  render() {
    return (
      <div className="App">
        <header className="Header">
          <h1>OER Collection</h1>
          <h2>from BCcampus</h2>
          <div className="Graphic"></div>
        </header>
        <div className="MainContent">
          <h1>Resource List</h1>
          <div className="OerSection">
            <ErrorBoundary>
              <Oer />
            </ErrorBoundary>
          </div>
        </div>
        <footer className="Footer">
          <p>This application was developed for BCcampus by Joe Hall. All content on this page is subject to BCcampus' terms of use.</p>
        </footer>
      </div>
    );
  }
}

export default App;
