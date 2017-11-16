//This is a testing file for async

var async = require('async');

var count = 0;
async.whilst(
    function() { console.log(count); var date = new Date(); console.log('test',date.getSeconds()); return count === 0; },
    function(callback) {
      var date = new Date();
        console.log('iterate',date.getSeconds())
        count++;
        setTimeout(function() {
          var date = new Date();
            console.log('timeout',date.getSeconds())
            callback(null, 1); //this callback will pass err or value to third function
        }, 2000);
    },
    function (err, n) {
      console.log(n) //n will be 1 from above
      var date = new Date();
      console.log('end callback',date.getMilliseconds())
        // 5 seconds have passed, n = 5
    }
);

var date = new Date();
console.log('after',date.getMilliseconds())
