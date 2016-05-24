var gulp = require('gulp');
var plumber = require('gulp-plumber');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');

gulp.task('scripts', function() {
  return gulp.src([
      "./node_modules/jquery/dist/jquery.js",      
      "./node_modules/bootstrap/dist/js/bootstrap.js",
      "./node_modules/angular/angular.js",          
      "./node_modules/bluebird/js/browser/bluebird.js"])
      .pipe(plumber())
      .pipe(uglify())
      .pipe(concat("main.js"))
      .pipe(gulp.dest("./public/js/"));
});

gulp.task('app', function() {
  return gulp.src([     
      "./frontend/js/*.js"])
      .pipe(plumber())
      //.pipe(uglify())
      .pipe(concat("app.js"))
      .pipe(gulp.dest("./public/js/"));
});

gulp.task('styles', function() {
  return gulp.src([
      "./node_modules/bootstrap/dist/css/bootstrap.css", 
      "./frontend/css/*.css"])    
      .pipe(plumber())
      .pipe(cssnano())
      .pipe(concat("main.css"))
      .pipe(gulp.dest("./public/css/"));
});

gulp.task('default', ['styles','scripts', 'app']);

gulp.task('watch', ['default'], function(){
    gulp.watch("./frontend/js/*.js", ["app"]);
    gulp.watch("./frontend/css/*.css", ["styles"]);
});