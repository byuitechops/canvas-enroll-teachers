const fs = require('fs');
const path = require('path');
const moment = require('moment');
const asyncLib = require('async');
const canvas = require('canvas-api-wrapper');
//canvas.subdomain = 'byui.beta'; // Comment this when running prod

let choices = {
    students: studentCore,
    teachers: teacherCore
};

let mapChoices = {
    students: mapStudentInputs,
    teachers: mapTeacherInputs
};

/***************************************************************
 *
 ***************************************************************/
function input() {
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

function studentCore(mappedInputs) {
    var goodEnrollments = [];
    var badEnrollments = [];

    /**************************************************
     * Code that sets up and makes the PUT reuqest. 
     * Reports errors in error badEnrollments var.
     **************************************************/
    function enrollStudent(courseData, callback) {
        courseData.students.forEach(student => {
            var enrollmentObj = {
                enrollment: {
                    user_id: `sis_user_id:${student.id}`,
                    type: 'StudentEnrollment',
                    enrollment_state: 'active',
                    notify: false
                }
            };

            if (false) { //courseData.incorrectTeachers) {
                // This course has the wrong teacher enrolled. Unenroll! :D
                unenrollStudent(student, err => {
                    if (err) {
                        console.log(err);
                        callback(null);
                    } else {
                        // Now enroll the correct teacher
                        canvas.post(`/api/v1/sections/${courseData.section.id}/enrollments`, enrollmentObj, (err) => {
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
                            console.log(`${courseData.section.id} | ${student.id} has been enrolled`);
                            goodEnrollments.push({
                                student: student,
                                err: err,
                                message: 'Successful Enrollment'
                            });
                            callback(null);
                        });
                    }
                });
            } else {
                // Course has 0 enrollments and is ready to recieve them
                canvas.post(`/api/v1/sections/${courseData.section.id}/enrollments`, enrollmentObj, (err) => {
                    if (err) {
                        console.log(err);
                        badEnrollments.push({
                            student: student,
                            err: err,
                            message: err.message
                        });
                        callback(null);
                        return;
                    }
                    console.log(`${courseData.section.id} | ${student.id} has been enrolled.`);
                    goodEnrollments.push({
                        student: student,
                        err: err,
                        message: 'Successful Enrollment'
                    });
                    callback(null);
                });
            }
        });

        /**************************************************
         * Code that sets up and makes the unenroll reuqest. 
         * Reports errors in error badEnrollments var.
         **************************************************/
        function unenrollStudent(student, utCallback) {
            canvas.delete(`/api/v1/sections/${courseData.section.id}/enrollments/${student.enrollmentId}?task=delete`, (err) => {
                if (err) {
                    utCallback(err);
                } else {
                    console.log(`${student.id} unenrolled from section: ${courseData.section.id}`);
                    utCallback(null);
                }
            });
        }
    }



    /**************************************************
     * Code that writes out report files. Also control-
     * flow, only 25 concurrent processes.
     **************************************************/
    asyncLib.eachLimit(mappedInputs.slice(0), 25, enrollStudent, (err) => {
        if (err) {
            console.log(err);
            return;
        }
        var date = moment().format('YYYYMMDD_kkmm');
        var output = {
            success: goodEnrollments,
            failure: badEnrollments,
        };

        fs.writeFileSync(`./reports/${date}-Enrollments.json`, JSON.stringify(output, null, 4));
        console.log('Enrollments complete.');
    });
}

/***************************************************************
 * Lots of copy-paste code here. See inner blocks for more detail
 ***************************************************************/
function teacherCore(mappedInputs) {
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

        if (false) { //courseData.incorrectTeachers) {
            // This course has the wrong teacher enrolled. Unenroll! :D
            unenrollTeachers(courseData, err => {
                if (err) {
                    console.log(err);
                    callback(null);
                } else {
                    // Now enroll the correct teacher
                    canvas.post(`/api/v1/sections/${courseData.section.id}/enrollments`, enrollmentObj, (err) => {
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
                        console.log(`${courseData.section.id} | ${courseData.teacher.id} has been enrolled in their Sandbox course.`);
                        goodEnrollments.push({
                            teacher: courseData,
                            err: err,
                            message: 'Successful Enrollment'
                        });
                        callback(null);
                    });
                }
            });
        } else {
            // Course has 0 enrollments and is ready to recieve them
            canvas.post(`/api/v1/sections/${courseData.section.id}/enrollments`, enrollmentObj, (err) => {
                if (err) {
                    console.log(err);
                    badEnrollments.push({
                        teacher: courseData,
                        err: err,
                        message: err.message
                    });
                    callback(null);
                    return;
                }
                console.log(`${courseData.section.id} | ${courseData.teacher.id} has been enrolled.`);
                goodEnrollments.push({
                    teacher: courseData,
                    err: err,
                    message: 'Successful Enrollment'
                });
                callback(null);
            });
        }
    }

    /**************************************************
     * Code that sets up and makes the unenroll reuqest. 
     * Reports errors in error badEnrollments var.
     **************************************************/
    function unenrollTeachers(courseData, unenrollCallback) {
        function unenrollTeacher(teacher, utCallback) {
            canvas.delete(`/api/v1/sections/${courseData.section.id}/enrollments/${teacher.enrollmentId}?task=delete`, (err) => {
                if (err) {
                    utCallback(err);
                } else {
                    console.log(`${teacher.id} unenrolled from section: ${courseData.section.id}`);
                    utCallback(null);
                }
            });
        }

        asyncLib.each(courseData.incorrectTeachers, unenrollTeacher, err => {
            if (err) {
                unenrollCallback(err);
            } else {
                unenrollCallback(null);
            }
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

        fs.writeFileSync(`./reports/${date}-Enrollments.json`, JSON.stringify(output, null, 4));
        console.log('Enrollments complete.');
    });
}
/***************************************************************
 * Takes inputs from json, and maps them to program expected inputs
 * TODO figure out what the initial input looks like, and map the data
 ***************************************************************/
function mapTeacherInputs(inputs) {
    inputs = inputs.filter(input => input.status === 'Failed' || input.status === 'No Teacher Enrollments');
    return inputs.map(input => {
        if (input.status === 'Failed') {
            return {
                incorrectTeachers: input.teachers, // I believe this is normally 1 however they are in a list because there could be multiple
                teacher: {
                    id: `sis_user_id:${input.correctTeacher}`
                },
                section: {
                    id: `sis_section_id:${input.id}`,
                },
            };
        } else {
            return {
                teacher: {
                    id: `sis_user_id:${input.correctTeacher}`
                },
                section: {
                    id: `sis_section_id:${input.id}`,
                },
            };
        }

    }).filter(input => input.teacher.id !== 'sis_user_id:000000000');
}

function mapStudentInputs(inputs) {
    inputs = inputs.filter(input => input.status === 'Failed' || input.status === 'No Student Enrollments');
    return inputs.map(input => {
        if (input.status === 'Failed') {
            return {
                incorrectStudents: input.students, // I believe this is normally 1 however they are in a list because there could be multiple
                students: input.correctStudents,
                section: {
                    id: `sis_section_id:${input.id}`,
                },
            };
        } else {
            return {
                students: input.correctStudents,
                section: {
                    id: `sis_section_id:${input.id}`,
                },
            };
        }
    });
}

/***************************************************************
 * Main Runner
 ***************************************************************/
function main() {
    let inputs = input(); // Run me with the enrollmentReport.json
    let choice = process.argv[3];
    let mappedInputs = mapChoices[choice](inputs);
    choices[choice](mappedInputs);
}

main();