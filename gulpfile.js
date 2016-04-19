'use strict';

var gulp = require('gulp'),
    templateCache = require('gulp-angular-templatecache'),
    minifyCSS = require('gulp-minify-css'),
    less = require('less'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint');

var config = {
    dist: './dist',
    src: './src'
};

gulp.task('templates', function () {
    return gulp.src('src/templates/**/*.html')
        .pipe(templateCache('itable.tpl.js'))
        .pipe(gulp.dest(config.dist));
});

gulp.task('js', function () {
    return gulp.src(config.src + '/*.js')
        .pipe(jshint())
        .pipe(uglify())
        .pipe(gulp.dest(config.dist));
});

gulp.task('less', function () {
    return gulp.src(config.src + '/less/**/*.less')
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(gulp.dest(config.dist + '/css'));
});

gulp.task('demo', function () {
    return gulp.src(config.dist)
        .pipe(gulp.dest('demo/dist/'))
});


gulp.task('build', ['templates', 'less', 'js', 'demo']);
