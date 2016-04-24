'use strict';

var gulp = require('gulp'),
    templateCache = require('gulp-angular-templatecache'),
    minifyCSS = require('gulp-minify-css'),
    less = require('gulp-less'),
    uglify = require('gulp-uglify'),
    eslint = require('gulp-eslint');

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
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError())
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
    return gulp.src(config.dist + '/*')
        .pipe(gulp.dest('demo/dist'))
});


gulp.task('build', ['templates', 'less', 'js', 'demo']);
