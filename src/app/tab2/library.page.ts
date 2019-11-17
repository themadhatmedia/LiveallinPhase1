import {AuthService} from './../core/services/auth.service';
import {SongType} from './../core/models/song.model';
import {HelperService} from './../core/services/helper.service';
import {Component, OnInit} from '@angular/core';
import {SongService} from '../core/services/song.service';
import {Song} from '../core/models/song.model';
import {NativeStorage} from '@ionic-native/native-storage/ngx';
import {ModalController} from '@ionic/angular';
import {MusicPlayerComponent} from '../core/components/music-player/music-player.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'library.page.html',
  styleUrls: ['library.page.scss']
})
export class LibraryPage implements OnInit {

  allSongs: Song[] = [];
  songsToDownload_new: Song[] = [];

  normalSongs: Song[] = [];
  instrumentalSongs: Song[] = [];
  backgroundVocalsSongs: Song[] = [];
  otherSongs: Song[] = [];
  songsToDownload: Song[] = [];
  saveSongsList: Song[] = [];
  selectedSong: Song = new Song();

  constructor(
    private auth: AuthService,
    private helper: HelperService,
    private modalCtrl: ModalController,
    private nativeStorage: NativeStorage,
    public songService: SongService
  ) {
  }

  ngOnInit() {
    const userPlan = window.localStorage.getItem('userPlan');
    const plan_arr = userPlan.split(',');
    this.normalSongs = [];
    this.instrumentalSongs = [];
    this.backgroundVocalsSongs = [];
    this.otherSongs = [];
    this.songsToDownload_new = [];
    this.saveSongsList = [];

    this.nativeStorage.getItem('songs').then(dbSongs => {
      Object.keys(plan_arr).forEach(key => {
        // console.log(plan_arr[key])  ;
        const plan_name = plan_arr[key];
        console.log('Plan == ' + plan_name);
        const songSub = this.songService.getSongs(plan_name).subscribe(apiSongs => {
          console.log(plan_name + '===== from Database ====');
          console.log(apiSongs);
          this.saveSongsList = dbSongs;
          this.filterSongsByReleaseDateNew(apiSongs); // All Songs may just be dbSongs
        });
      });
    });
  }


  filterSongsByReleaseDateNew(songs: Song[]): void {
    const currentDate = new Date();
    // If it's a subscription user they only have access to songs since their signup date
    if (this.auth.user.planType === 'subscription') {
      songs = songs.filter(song => new Date(song.releaseDate) > new Date(this.auth.user.signUpDate));
    } else if (this.auth.user.planType === 'charge' && !this.auth.user.planName.includes('Early')) {
      songs = songs.filter(song => new Date(song.releaseDate) > new Date('12/31/18'));
    }
    const filteredSongs = songs.filter(song => new Date(song.releaseDate) < currentDate);

    filteredSongs.forEach(song => {
      let isFound = true;

      this.saveSongsList.forEach(s => {
        if (song.title === s.title) {
          isFound = false;
        }
      });

      if (isFound === true) {
        this.songsToDownload_new.push(song);
      }
    });

    this.saveSongsList.forEach(song => {
      if (song.audioPath !== '') {
        let check;
        switch (song.songType) {
          case SongType.Normal:
            check = this.normalSongs.find(s => s.title === song.title);
            if (!check) {this.normalSongs.push(song);}
            break;
          case SongType.Instrumental:
            check = this.instrumentalSongs.find(s => s.title === song.title);
            if (!check) {this.instrumentalSongs.push(song);}
            break;
          case SongType.BackgroundVocals:
           check = this.backgroundVocalsSongs.find(s => s.title === song.title);
            if (!check) {this.backgroundVocalsSongs.push(song);}
            break;
          case SongType.Other:
            check = this.otherSongs.find(s => s.title === song.title);
            if (!check) {this.otherSongs.push(song);}
            break;
          default:
            alert('Invalid Song Type');
        }
      }
    });
    this.sortSongs();
  }


  downloadSong(song: Song, index: number): void {
    this.helper.presentLoading('Downloading Song');
    this.songService.downloadSongAudio(song).then((audioEntry) => {
      song.audioPath = audioEntry.toURL();
      this.songService.downloadSongImage(song).then((imageEntry) => {
        song.imagePath = imageEntry.toURL();
        switch (song.songType) {
          case SongType.Normal:
            this.normalSongs.push(song);
            break;
          case SongType.Instrumental:
            this.instrumentalSongs.push(song);
            break;
          case SongType.BackgroundVocals:
            this.backgroundVocalsSongs.push(song);
            break;
          case SongType.Other:
            this.otherSongs.push(song);
            break;
          default:
            alert('Invalid Song Type');
        }
        this.songsToDownload_new.splice(index, 1);
        this.saveSongs(song);
        this.helper.dismissLoading();
      });
    });
  }

  filterSongsByReleaseDate(songs: Song[]): void {
    const currentDate = new Date();
    // If it's a subscription user they only have access to songs since their signup date
    if (this.auth.user.planType === 'subscription') {
      songs = songs.filter(song => new Date(song.releaseDate) > new Date(this.auth.user.signUpDate));
    } else if (this.auth.user.planType === 'charge' && !this.auth.user.planName.includes('Early')) {
      songs = songs.filter(song => new Date(song.releaseDate) > new Date('12/31/18'));
    }
    const filteredSongs = songs.filter(song => new Date(song.releaseDate) < currentDate);
    filteredSongs.forEach(song => {
      if (song.audioPath) {
        switch (song.songType) {
          case SongType.Normal:
            this.normalSongs.push(song);
            break;
          case SongType.Instrumental:
            this.instrumentalSongs.push(song);
            break;
          case SongType.BackgroundVocals:
            this.backgroundVocalsSongs.push(song);
            break;
          case SongType.Other:
            this.otherSongs.push(song);
            break;
          default:
            alert('Invalid Song Type');
        }
      } else {
        this.songsToDownload.push(song);
      }
    });
    this.sortSongs();
  }

  getSongsFromDB(): void {
    this.nativeStorage.getItem('songs').then(dbSongs => {
      this.saveSongsList = dbSongs;
    });
  }

  getSongsFromFirebase(): void {
    console.log('get songs');
    const songSub = this.songService.getSongs('gggg').subscribe(apiSongs => {
      console.log(apiSongs);
      this.addNewSongs(apiSongs);
      this.filterSongsByReleaseDateNew(this.allSongs); // All Songs may just be dbSongs
      songSub.unsubscribe();
    });
  }

  async selectSong(songs: Song[], selectedIndex: number) {
    const modal = await this.modalCtrl.create({
      component: MusicPlayerComponent,
      componentProps: {
        'songs': songs,
        'activeIndex': selectedIndex
      }
    });
    modal.onDidDismiss().then(() => {
      this.selectedSong = new Song();
    });
    return await modal.present();
  }

  private addNewSongs(apiSongs: Song[]): void {
    let addedSong = false;
    apiSongs.forEach(apiSong => {
      let foundSong = false;
      for (let i = 0; i < this.allSongs.length; i++) {
        const song = this.allSongs[i];
        if (apiSong.title === song.title) {
          foundSong = true;
          break;
        }
      }
      if (!foundSong) {
        addedSong = true;
        this.allSongs.push(apiSong);
      }
    });
    if (addedSong) {
      this.nativeStorage.setItem('songs', this.allSongs);
    }
  }

  private saveSongs(song: Song): void {
    this.saveSongsList.push(song);
    this.nativeStorage.setItem('songs', this.saveSongsList);
  }

  private sortSongs(): void {
    this.normalSongs.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
    this.instrumentalSongs.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
    this.songsToDownload_new.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
    this.backgroundVocalsSongs.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
    this.otherSongs.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
  }
}
