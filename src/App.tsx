import React from 'react';
import './App.css';
import './Editor.css';
import Navbar from './Navbar';
import { NetworkExplorer } from './Network';
import { NodesExplorer } from './Nodes';
import './Configurator';
import { Configurator } from './Configurator';

function App() {
  return (
    <div className="App">
      {Navbar()}

      <div className="Editing">
        <div className="Explorer">
          {NetworkExplorer()}
          {NodesExplorer()}
        </div>
        <div className="Configurator">
          {Configurator()}
        </div>
      </div>
    </div>
  );
}

export default App;
