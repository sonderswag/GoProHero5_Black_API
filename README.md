# GoPro Hero 5 Black API

This a library that provides basic some basic functions to control a GoPro Hero 5. The device running the code in the library must be connected to the GoPro's Access Point in order for it to work.

 The GoPro api uses http.get request for all communications the response from the
 get request will happen before some functionality has occurred. For example when commanding the shutter to activate, the response of the request will return before the camera is done taking a picture or video.In order to avoid unwanted behaviour I wrap all command request such that they will not call their callback until the operation is complete on the goPro. This does complicate the code, but makes it safe to write code like the following.

```java
   takePhoto((err) => {
     if (err) return console.log(err);
     downloadPhotos('./pics', 1, (err) => {
     console.log('done')
   })
 })
```

 without wrapping this code will try to downloadPhotos while the goPro is still taking an image, Which results in the SD card to getting corrupted.

 In order to accomplish this behaviour I have many of the function request more information from the GoPro to see if it has updated its status. This can results the completion of operations being slower.

# Functions
```java
getStatus(callback)
```
Retrieve the status of the goPro. Refer to [GoPro API] to see what each item means

```java
setCameraMode(mode,callback)
```
Sets the goPro into whatever mode of operation such as video or still photo.

```java
takePhoto(callback)
```
Take a still photo. Will first check to see if the camera is in still photo mode. If it is then uses shutter command. If it isn't changes the mode to still photo than uses the shutter command.

```java
getMediaList(callback)
```

```java
getMediaAddress(callback)
```

```java
downloadPhotos(dest,number,callback)
```
Downloads a  `number` of the most recent still images to the `destination` provided.

# Todos

- Add in video control functions
  - Record for a certain amount of time
  - Start Recording
  - Stop Recording
- Add in Time Lapse control functions
  - Time Lapse for a certain amount of time
  - Start
  - Stop
- Live Streaming : This is the hard one :)


 [GoPro API](https://github.com/KonradIT/goprowifihack
