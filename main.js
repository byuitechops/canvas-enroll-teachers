const path = require('path');
const fs = require('fs');
const asyncLib = require('async')
const canvas = require('canvas-api-wrapper');

/***************************************************************
 *
 ***************************************************************/
async function input() {
    let fileLocation = process.argv[2];
    let inputs;
    if (fs.existsSync(fileLocation) && path.extname(fileLocation) === '.json') {
        inputs = getInputViaJson(fileLocation);
    }

    return inputs;

    function getInputViaJson(file) {
        return require(file);
    }
}

/***************************************************************
 * Lots of copy-paste code here. See inner blocks for more detail
 ***************************************************************/
async function core(mappedInputs) {
    var goodEnrollments = [];
    var badEnrollments = [];

    /**************************************************
    * Code that sets up and makes the PUT reuqest. 
    * Reports errors in error badEnrollments var.
    **************************************************/
    function enrollTeacher(courseData, callback) {
        var enrollmentObj = {
            enrollment: {
                user_id: courseData.teacher.id,
                type: 'TeacherEnrollment',
                enrollment_state: 'active',
                notify: false
            }
        };

        canvas.post(`/api/v1/courses/${courseData.course.id}/enrollments`, enrollmentObj, (err, success) => {
            if (err) {
                console.log(err);
                badEnrollments.push({
                    teacher: courseData,
                    err: err,
                    message: 'Error Enrolling'
                });
                callback(null);
                return;
            }
            console.log(`${courseData.course.id} | ${courseData.teacher.name} has been enrolled in their Sandbox course.`);
            goodEnrollments.push({
                teacher: courseData,
                err: err,
                message: 'Successful Enrollment'
            });
            callback(null);
        });
    }

    /**************************************************
    * Code that writes out report files. Also control-
    * flow, only 25 concurrent processes.
    **************************************************/
    asyncLib.eachLimit(mappedInputs.slice(0), 25, enrollTeacher, (err) => {
        if (err) {
            console.log(err);
            return;
        }
        var date = moment().format('YYYYMMDD_kkmm');
        var output = {
            success: goodEnrollments,
            failure: badEnrollments,
        };

        fs.writeFileSync(`./${date}-Enrollments.json`, JSON.stringify(output, null, 4));

        console.log('Enrollments complete.');
    });
}
/***************************************************************
 * Takes inputs from json, and maps them to program expected inputs
 * TODO figure out what the initial input looks like, and map the data
 ***************************************************************/
function mapInputs(inputs) {
    // TODO do whole map here, return new array
    return {
        teacher: {
            id: null,
            name: null,
        },
        course: {
            id: null,
        },
    }
}

/***************************************************************
 * UNUSED
 ***************************************************************/
async function output(outputs) {
    return;
}

/***************************************************************
 * Main Runner
 ***************************************************************/
async function main() {
    let inputs = await input();
    let mappedInputs = mapInputs(inputs);
    let outputs = await core(mappedInputs);
    await output(outputs);
}

main().catch(console.error)