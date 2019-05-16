let json = require('./missingWithDuplicates.json');

console.log(JSON.stringify(json.map(data => ({
    teacherId: data.teacher.id,
    courseId: data.course.id
}))));