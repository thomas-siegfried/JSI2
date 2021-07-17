const gulp = require('gulp');
const ts = require('gulp-typescript');
const gulpclean = require('gulp-clean');
const jasmine = require('gulp-jasmine');
const tsProject = ts.createProject('tsconfig.json');

function build(){
    return tsProject.src().pipe(tsProject())
    .js
    .pipe(gulp.dest('dist'));
}

function clean(){
    return gulp.src('./dist/*.js')
    .pipe(gulpclean());
}

function test(){
    return gulp.src('./dist/spec/*_spec.js')
    .pipe(jasmine());
}

function watch(){
    return gulp.watch(['src/**/*.ts','spec/**/*.ts'],{ignoreInitial:false},gulp.series(clean,build,buildTypes,test));
}

function buildTypes(){
    
    var out =gulp.src('src/**/*.ts').pipe(tsProject());
    return out.dts.pipe(gulp.dest('dist/types'))
}

gulp.task('default',gulp.series(clean,build,buildTypes));
gulp.task('test',gulp.series(clean,build,buildTypes,test));
gulp.task('watch',watch);


