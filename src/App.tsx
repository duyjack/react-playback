import React from 'react';
import logo from './logo.svg';
import './App.css';
import { VideoSeekSlider } from "react-video-seek-slider";
import "react-video-seek-slider/styles.css";
import { Scenario } from './model/scene';

interface MediaComponent {
  id: string;
  start: number;
  end: number;
  playing: boolean;
  done: boolean;
}

const TIME_STEP = 1;

const DOMAIN = process.env.REACT_APP_RECORDING_URL;

enum StatusRecording {
  INIT,
  NOT_FOUND,
  LOADING,
  LOADED,
}

export default class App extends React.Component {
  state = {
    statusRecording: StatusRecording.INIT,
    maxTime: 0,
    currentTime: 0,
    roomId: null,
  }
  scenario?: Scenario;
  playInterval?: NodeJS.Timer;
  audioComponents: Map<String, MediaComponent> = new Map();
  running = false;

  componentDidMount() {
    // console.log('scenario', dataScenario);
    if (this.running) {
      return;
    }
    this.running = true;
    this.setState({
      statusRecording: StatusRecording.LOADING,
    }, () => {
      const url = window.location.search;
      const urlParams = new URLSearchParams(url);
      const roomId = urlParams.get('roomId');
      if (!roomId) {
        this.setState({
          statusRecording: StatusRecording.NOT_FOUND
        });
        return;
      }
      fetch(`${DOMAIN}/${roomId}/${roomId}.json`).then(async (res) => {
        const data = await res.json();
        console.log(data);
        this.scenario = new Scenario(data);
        this.setState({
          roomId: roomId,
          maxTime: this.scenario.scenes[this.scenario.scenes.length - 1].endTime
        }, () => this.createComponents());
      });
    })
  }

  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void {
  }

  play(): void {
    console.log('play');
    if (this.playInterval) {
      clearTimeout(this.playInterval);
    }
    this.playComponents();
    const runnable = () => {
      if (this.state.currentTime + 1000 < this.state.maxTime) {
        this.setState({
          currentTime: this.state.currentTime + TIME_STEP,
        }, () => {
          this.playComponents();
          if (this.playInterval) {
            clearTimeout(this.playInterval);
          }
          this.playInterval = setTimeout(runnable, TIME_STEP);
        });
      } else {
        this.setState({
          currentTime: this.state.maxTime,
        }, () => clearTimeout(this.playInterval))
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
    // const scenes = this.scenario?.scenes.filter(scene => this.state.currentTime <= scene.endTime);
    const scenes = this.scenario?.scenes;
    if (!scenes || scenes.length == 0) {
      this.setState({
        statusRecording: StatusRecording.NOT_FOUND
      });
      return;
    }
    for (let scene of scenes) {
      scene.voices.forEach((media, key) => {
        console.log('key', key);
        console.log('this.audioComponents.get(key)', this.audioComponents.get(key));
        if (!this.audioComponents.get(key)) {
          let audioElement = document.createElement('audio') || document.getElementById(key.toString());
          const roomId = this.state.roomId;
          console.log(roomId);
          if (!audioElement.canPlayType('audio/ogg')) {
            let audioSource = document.createElement('source');
            audioSource.src = `${DOMAIN}/${roomId}/${media.audio}`.replaceAll('ogg', 'mp3');
            audioSource.type = `audio/mpeg`;
            audioElement.append(audioSource);
          } else {
            audioElement.src = `${DOMAIN}/${roomId}/${media.audio}`;
          }
          audioElement.id = key.toString();
          audioElement.muted = true;
          let playing = false;
          const mediaComponent: MediaComponent = {
            id: key.toString(),
            start: media.start,
            end: media.end,
            playing: playing,
            done: false,
          }
          audioElement.onplay = () => {
            audioElement.muted = false;
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
      this.setState({
        statusRecording: StatusRecording.LOADED
      });
    }
  }

  setCurrentTime(e: number) {
    console.log('setCurrentTime', e);
    this.setState({
      currentTime: e
    }, () => {
      // this.createComponents();
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
    const autoPlay = false;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          {this._renderContent()}
        </header>
      </div>
    );
  }

  _renderContent() {
    const statusRecording = this.state.statusRecording;
    switch (statusRecording) {
      case StatusRecording.INIT:
        return <div></div>;
      case StatusRecording.LOADED:
        return <div>
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
        </div>
      case StatusRecording.LOADING:
        return <div>Loading</div>
      case StatusRecording.NOT_FOUND:
        return <div>Record not found</div>
    }
  }
}
