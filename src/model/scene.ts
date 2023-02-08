export class Scenario {
    scenes: Scene[] = [];

    constructor(data: any) {
        const scenes = Object.keys(data);
        let currentTime = 0;
        for (let key of scenes) {
            const scene = new Scene(data[key], currentTime);
            currentTime = scene.duration;
            this.scenes.push(scene);
        }
        console.log(this);
    }
}

export class Media {
    id: String;
    start: number;
    end: number;
    audio?: string;
    video?: string;

    constructor(info: any, start: number, currentTime: number) {
        this.id = info.id;
        this.start = info.start - start + currentTime;
        this.end = info.end - start + currentTime;
        this.audio = info.audio ?? null;
        this.video = info.video ?? null;
    }
}

export class Scene {
    sharescreens: Map<String, Media> = new Map();
    voices: Map<String, Media> = new Map();
    startTime: number;
    endTime: number;

    constructor(scene: any, currentTime = 0) {
        this.startTime = currentTime;
        this.endTime = scene.end - scene.start + currentTime;
        for (let voice of Object.values(scene.voices)) {
            const media = new Media(voice, scene.start, currentTime);
            this.voices.set(media.id, media);
        }
    }

    get duration(): number {
        return this.endTime - this.startTime;
    }
}