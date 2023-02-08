import React from 'react';
import logo from './logo.svg';
import './App.css';
import { VideoSeekSlider } from "react-video-seek-slider";
import "react-video-seek-slider/styles.css";
import dataScenario from './resources/scenario.json';
import { Scenario } from './model/scene';

interface MediaComponent {
  id: string;
  start: number;
  end: number;
  playing: boolean;
  done: boolean;
}

const TIME_STEP = 1;

export default class App extends React.Component {
  state = {
    maxTime: 0,
    currentTime: 0,
  }
  scenario?: Scenario;
  playInterval?: NodeJS.Timer;
  audioComponents: Map<String, MediaComponent> = new Map();
  running = false;

  componentDidMount() {
    // console.log('scenario', dataScenario);
    if (!this.running) {
      this.running = true;
      this.scenario = new Scenario(dataScenario);
      this.setState({
        maxTime: this.scenario.scenes[this.scenario.scenes.length - 1].endTime
      });
      this.createComponents();
    }
  }

  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void {
  }

  play(): void {
    console.log('play');
    if (this.playInterval) {
      clearInterval(this.playInterval);
    }
    this.playComponents();
    const runnable = () => {
      if (this.state.currentTime + 1000 < this.state.maxTime) {
        this.setState({
          currentTime: this.state.currentTime + TIME_STEP,
        }, () => {
          this.playComponents();
          if (this.playInterval) {
            clearInterval(this.playInterval);
          }
          this.playInterval = setTimeout(runnable, TIME_STEP);
        });
      } else {
        this.setState({
          currentTime: this.state.maxTime,
        }, () => clearInterval(this.playInterval))
      }
    };
    this.playInterval = setTimeout(runnable, TIME_STEP);
  }

  playComponents() {
    this.audioComponents.forEach(component => {
      const { currentTime } = this.state;
      const index = Array.from(this.audioComponents.values()).indexOf(component);
      if (component.start <= currentTime && currentTime < component.end) {
        console.log(`component ${index} - playing ${component.playing} - done ${component.done}`);
        if (!component.playing && !component.done) {
          console.log(`component ${index} - currentTime ${currentTime} - start ${component.start} - end ${component.end}`)
          component.playing = true;
          this.elementPlayAudio(component.id, currentTime - component.start);
        }
      }
    });
  }

  createComponents() {
    this.audioComponents.forEach((component) => {
      this.elementStopAudio(component.id);
      component.done = false;
    })
    // this.audioComponents.clear();
    const scenes = this.scenario?.scenes.filter(scene => this.state.currentTime <= scene.endTime);
    if (scenes) {
      for (let scene of scenes) {
        scene.voices.forEach((media, key) => {
          console.log('key', key);
          console.log('this.audioComponents.get(key)', this.audioComponents.get(key));
          if (!this.audioComponents.get(key)) {
            let audioElement = document.createElement('audio') || document.getElementById(key.toString());
            audioElement.id = key.toString();
            audioElement.src = `./${media.audio}`;
            let playing = false;
            const mediaComponent: MediaComponent = {
              id: key.toString(),
              start: media.start,
              end: media.end,
              playing: playing,
              done: false,
            }
            audioElement.onplay = () => {
              mediaComponent.playing = true;
            }
            audioElement.onpause = () => {
              mediaComponent.playing = false;
            }
            audioElement.onended = () => {
              mediaComponent.playing = false;
              mediaComponent.done = true;
            }
            this.audioComponents.set(key, mediaComponent);
            document.body.appendChild(audioElement);
          }
        });
      }
    }
  }

  setCurrentTime(e: number) {
    console.log('setCurrentTime', e);
    this.setState({
      currentTime: e
    }, () => {
      this.createComponents();
      console.log('setCurrentTime', e);;
    });
  }

  elementPlayAudio(id: string, currentTime: number) {
    const audio = document.getElementById(id) as HTMLAudioElement;
    console.log('audio', audio);
    audio.currentTime = currentTime;
    audio.play().then(() => console.log('play audio')).catch(reason => console.log('reason', reason));
  }

  elementStopAudio(id: string) {
    const audio = document.getElementById(id) as HTMLAudioElement;
    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <button className="btn" onClick={() => this.play()}><i className="fa fa-play"></i></button>
          <VideoSeekSlider
              max={this.state.maxTime}
              currentTime={this.state.currentTime}
              bufferTime={TIME_STEP}
              onChange={this.setCurrentTime.bind(this)}
              limitTimeTooltipBySides={true}
              secondsPrefix="00:"
              minutesPrefix="0:"
            />
        </header>
      </div>
    );
  }
}
