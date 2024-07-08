/*
If you call registration with class & student number,
method will return uuid of the clicker device as a String.
API
classSaathi.registerStudent(classNum: number, studentNum: number, numberToPress: number): Promise<String>

*/
const { timer } = require("rxjs");
const rcService = require("./remoteControl");
let { first } = require("rxjs/operators");

/**
 *
 * @param {*} classNum
 * @param {*} studentNum
 * @param {*} regKey Math.floor(Math.random() * 4) + 2;
 */
function register(classNum, studentNum, regKey) {
  return new Promise((resolve) => {
    rcService.open();
    this.remoteControlEventsSubscription = rcService.events.subscribe(
      (data) => {
        if (data.type === "opened") {
          console.log(classNum);
          console.log(studentNum);
          console.log(regKey);
          if (this.remoteControlEventsSubscription) {
            this.remoteControlEventsSubscription.unsubscribe();
          }
          startRegister(classNum, studentNum, regKey, resolve);
        }
      }
    );
  });
}

function startRegister(classNum, studentNum, registerNum, resolve) {
  timer(500, 500)
    .pipe(first())
    .subscribe(() => {
      console.log("Register Scan");
      rcService.startRegister(classNum, studentNum, registerNum);
      startListening(classNum, studentNum, resolve);
    });
}

function isValidRegisterData(value, classNum, studentNum) {
  return (
    value &&
    value.data &&
    value.data[4] == 17 &&
    value.payload &&
    value.payload.classNumber === classNum &&
    value.payload.studentNumber === studentNum
  );
}

function startListening(classNum, studentNum, resolve) {
  rcService.subscribeEvents((data) => {
    console.log(data);
    if (isValidRegisterData(data, classNum, studentNum)) {
      console.log("Finish Register");
      rcService.startRegister(
        classNum,
        studentNum,
        Math.floor(Math.random() * 4) + 2
      );
      /*rcService.finishRegister();
      rcService.unsubscribeEvents();
      rcService.close();
      resolve(data.payload.id);*/
    }
  });
}

exports.register = register;

//module.exports = register;
