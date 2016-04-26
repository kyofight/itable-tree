'use strict';

var gulp = require('gulp'),
    gulpSequence = require('gulp-sequence'),
    clean = require('gulp-clean'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    templateCache = require('gulp-angular-templatecache'),
    cleanCSS = require('gulp-clean-css'),
    less = require('gulp-less'),
    uglify = require('gulp-uglify'),
    eslint = require('gulp-eslint');

var config = {
    dist: './dist',
    src: './src',
    demoDist: 'demo/dist'
};

gulp.task('templates', function () {
    return gulp.src('src/templates/**/*.html')
        .pipe(templateCache('itable.tree.tpl.js'))
        .pipe(gulp.dest(config.dist + '/js'));
});

gulp.task('js', function () {
    return gulp.src(config.src + '/*.js')
        .pipe(eslint())
        .pipe(concat('itable.tree.js'))
        //.pipe(eslint.format())
        //.pipe(eslint.failOnError())
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dist + '/js'));
});

gulp.task('less', function () {
    return gulp.src(config.src + '/less/**/*.less')
        .pipe(concat('itable.tree.less'))
        .pipe(less())
        .pipe(cleanCSS())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(config.dist + '/css'));
});

gulp.task('clean', function () {
    return gulp.src([config.dist, config.demoDist])
        .pipe(clean({force: true}));
});

gulp.task('demo', function () {
    return gulp.src(config.dist + '/**/*')
        .pipe(gulp.dest(config.demoDist, {overwrite: true}))
});


gulp.task('build', gulpSequence('clean', ['templates', 'less', 'js'], 'demo'));
