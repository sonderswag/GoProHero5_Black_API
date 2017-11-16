//Author: Christian Wagner

var request = require("request");
var fs  = require("fs");
var async = require('async');

/*Class GoProHero5
prupose: to provide an API for goPro Hero5
Functionality:
*/



var GoProHero5 = function (options) {

  var options = options  || {}
  this.ipAdd = options.ip || '10.5.5.9'
  this.goHttp = 'http://'+this.ipAdd+'/gp/gpControl'
  this.mediaFolder = null;

};

/*getStatus
purpose: get the status of the goPro
@callback: handle a json of the status
*/
GoProHero5.prototype.getStatus = function(callback) {

  var err = null
  request.get('http://10.5.5.9/gp/gpControl/status',{timeout: 1000}, (error,res,body) => {
    if (err) {
      err = error
      return
    }
    return callback(null,JSON.parse(body))
  })

  if (err) {
    return callback(err)
  }

}

//NOTE: weird bug: multiShot actually goes to time lapse
// also mode = 1 will sometimes go to multishot sometimes goes to photo
// appears to go to whichever mode it was last in when it was called to either timelapse or video

/*setCameraMode
purpose: quick way to set the camera mode
@param mode: select one of the three primary modes
@callback: passes to the request.get for changing the mode
*/
GoProHero5.prototype.setCameraMode = function(mode,mainCallback) {
  var modeValue = null
  var subMode = null
  if (mode === 0 || mode === 'video' || mode === 'Video') {
    modeValue = 0
    subMode = 0
  }
  else if (mode === 1 || mode === 'photo' || mode === 'Photo') {
    modeValue = 1
    subMode = 1
  }
  else if (mode === 2 || mode === 'multiShot' || mode === 'MultiShot') {
    modeValue = 2
    subMode = 0
  }
  else if (mode === 3 || mode === 'timeLapse' || mode === 'TimeLapse') {
    modeValue = 2
    subMode = 1
  }
  else {
    modeValue = 0
  }

  //set the mode, but first check to see what the current mode is
  request.get('http://10.5.5.9/gp/gpControl/status',{timeout: 1000},(err,res,body) => {
      if (err) {
        return mainCallback(err)
      }
      var currentMode = JSON.parse(body).status['43']
      var tryCount = 0
      async.whilst(
        function() {return currentMode !== modeValue && tryCount < 10},
        function(callback) {
          tryCount += 1
          console.log("setting mode")
          //if the current mode isn't the desire mode
          request.get('http://10.5.5.9/gp/gpControl/command/sub_mode?mode='+modeValue+'&sub_mode='+subMode,{timeout: 1000}, (err) => {
            if (err) {
              return callback(err)
            }
            setTimeout(function() {
              //check status to see if the change has happen after 500ms
              request.get('http://10.5.5.9/gp/gpControl/status',(err,res,body) => {
                if (err) {
                  return callback(err)
                }
                currentMode = JSON.parse(body).status['43']
                callback(null,currentMode)
              })
            },500)
          })
        },
        function(err,mode) {
          //called once in the proper mode
          mainCallback(err,mode)
        }
      )
  })
}


/*takePhoto
purpose: take a photo, wraps the shutter command with this assertion
@callback : called in response to the shutter command will only be called once the picture has been taken
*/
GoProHero5.prototype.takePhoto = function(mainCallback) {
  var currentNumberPic = null;
  var newNumberPic = null;
  var currentMode  = null;
  var status = 'Camera is busy';
  request.get('http://10.5.5.9/gp/gpControl/status',(err,res,body) => {
    if (err) {
      return callback(err)
    }
    //get the current number of photos
    currentNumberPic = JSON.parse(body).status['38']
    console.log("currentNumberPic",currentNumberPic)

    //make sure it is in the right mode
    this.setCameraMode(1,(err,value) => {
      //now that the goPro is in camera mode take picture
      var tryCount = 0
      if (err) {
        mainCallback(err)
      }
      // send command to take a picture
      request.get('http://10.5.5.9/gp/gpControl/command/shutter?p=1',(err,res,body) => {
        if (err) {
          return mainCallback(err)
        }

        // taking a picture takes non-zero amoumnt of time
        // need to wait until getting medialist doesn't return 'Camera is busy'
        // max wait time is 10s
        async.whilst(
          function() { return (status === 'Camera is busy' && tryCount < 20) },
          function(callback) {
            tryCount += 1
            setTimeout(function() {
              request.get('http://10.5.5.9:8080/gp/gpMediaList',(err,res,body) => {
                if (err) {
                  return callback(err)
                }
                // will attempt to take photo again if 5s in
                if (tryCount == 10) {
                  request.get('http://10.5.5.9/gp/gpControl/command/shutter?p=1')
                }
                status = JSON.parse(body).message

                console.log('status',JSON.parse(body))
                callback(null)
              })
            },500)
          },
          function(err) {
            if (tryCount == 20) {
              return mainCallback(new Error("did not take picture"))
            }
            //picture should have been taken
            mainCallback(null);
          }
        )
      })
    })
  })
}

/*getMediaList
purpose: get list of all media on sd card with newest first
@callback :will be called with medialist as an argument
*/
GoProHero5.prototype.getMediaList = function(callback) {
  request.get('http://10.5.5.9:8080/gp/gpMediaList',(err,res,body) => {
    if(err) {
      return callback(err);
    }
    var body = JSON.parse(body)
    var id = body.id
    this.mediaFolder = body.media[0].d
    var mediaList = body.media[0].fs.reverse() //newest photos first
    return callback(null,mediaList)

  })
}

/*getPhotoAddressList
purpose:get an array of all the media html address
@callback: deal with errors and do something with the medialist
*/
GoProHero5.prototype.getMediaAddress  = function(callback) {
  request.get('http://10.5.5.9:8080/videos/DCIM/100GOPRO/', (err,res,body) => {
    if (err) {
      return callback(err)
    }
    var pics = body.split(/\r?\n/)
    .filter(line => line.search('href=\"/videos') !== -1 ) //filter out everythign not media
    return callback(null,pics.reverse()) //reverse so newest is first
  })
}

/*downloadAllPhotos
purpose: Download photos from GoProHero5
@param dest : destination of where to download the photos
@param number : number of photos to be downloaded newest first, leave blank to download all
@callback: will be called when a file finishes downloading
*/
GoProHero5.prototype.downloadPhotos = function(dest,number,callback) {

  //check arguments for the correct types, mainly if user wants to download all photos
  if (typeof(number) === 'function' && typeof(callback) === 'undefined') {
    callback = number
    number = undefined
  }

  //get the list of media that is on the sd card
  this.getMediaList((err,mediaList) => {
    if (err) {
      return callback(err)
    }
    //handle if you only want to download a few  pictures
    if (typeof(number) === 'number') {
      if (number > mediaList.length ) number = mediaList.length;
      mediaList = mediaList.slice(0,number)
    }

    // download photos but first filter out anything not a .JPG
    var photos = mediaList.filter((item) => {
      return item.n.search('.JPG') !== -1 && Object.keys(item).length === 3;
    })

    //make sure to download all photos before calling this downloadPhotos callback
    async.forEachOfSeries(photos, (item,key,callback) => {
      var addr = 'http://10.5.5.9:8080/videos/DCIM/'+this.mediaFolder+'/'+item.n
      console.log(addr)
      request(addr).pipe(fs.createWriteStream(dest+'/'+item.n)).on('close', () => {console.log(item.n+" downloaded"); callback()});
      }, callback)
  })
}



//NOTE:function not working yet
GoProHero5.prototype.stream = function() {

  // restart it
  request.get(' http://10.5.5.9/gp/gpControl/execute?p1=gpStream&a1=proto_v2&c1=restart')
  .on('resolve', () => {
  })
}


// // DEPRICATED FUNCTION
// /*downloadAllPhotos
// purpose: Download photos from GoProHero5
// @param dest : destination of where to download the photos
// @callback: will be called when a file finishes downloading
// */
// GoProHero5.prototype.downloadAllPhotos = function(dest,callback) {
//
//   this.getMediaList((err,mediaList) => {
//     console.log(mediaList)
//
//     //get just tje address of the JPG media
//     mediaList.map((line) => {
//       var ref = line.search('href=')
//       var endRef = line.search('</a>')
//       var addr = line.slice(ref+6,endRef)
//       return addr.slice(0,addr.search('>')-1)
//     })
//     // now download the photos
//     .forEach((photo) => {
//       request.head('http://10.5.5.9:8080'+photo,(err,res,body) => {
//         request('http://10.5.5.9:8080'+photo).pipe(fs.createWriteStream(dest+'/'+photo.slice(22))).on('close', callback);
//       })
//     })
//   })
// }


// ----------------------------------------------------- for testing purposes --------------------------------------------
// var cam = new GoProHero5()


// cam.getStatus((err,body) => {
//   if (err) {
//     console.log(err)
//     return
//   }
//   console.log(body.status)
// })

// cam.takePhoto((err) => {
//   if (err) {
//     console.log(err)
//     return
//   }
//   console.log("picture taken")
//   cam.downloadPhotos('./pics', () => {
//     console.log('done')
//   })
// })

// cam.takePhoto((err,res,body) => {
//   if (err) {
//     console.log(err)
//     return
//   }
//   console.log("Picture taken ")
// })
