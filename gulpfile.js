const isProduction = process.argv.includes('--build');

const gulp = require('gulp');

const less = require('gulp-less');
const autoPrefix = require('autoprefixer');
const sourceMaps = require('gulp-sourcemaps');
const cleanCSS = require('gulp-clean-css');

const postcss = require('gulp-postcss');
const postcssAssets = require('postcss-assets');
const postcssPresetEnv = require('postcss-preset-env');
const postcssCalc = require("postcss-calc");
const postcssImport = require("postcss-import");
const tailwindcssNesting = require("tailwindcss/nesting");
const tailwindcss = require("tailwindcss");

const notify = require('gulp-notify');
notify.logLevel(0);

const combiner = require('stream-combiner2');
const plumber = require('gulp-plumber');
const log = require('fancy-log');
const size = require('gulp-size');

const browserSync = require('browser-sync').create();

let source = {
	less: {
		main: {
			path: 'public/css',
			files: ['styles/main.less']
		},
	},
	image: ['images/'],
	watch: {
		image: 'images/**/*',
		styles: ['styles/**/*.less', 'styles/**/*.css'],
		content: ['public/**/*.html', 'public/**/*.php']
	}
};

// less
gulp.task('less', function() {
	return gulp.src(source.less.main.files)
		.pipe(plumbError())
		.pipe(processLess())
		.pipe(browserSync.stream({match: "**/*.css"}))
		.pipe(gulp.dest(source.less.main.path));
});


// watch
gulp.task('watch:html', function() {
	gulp.watch(source.watch.content).on('change', gulp.series('less', browserSync.reload));
});

gulp.task('watch:image', function() {
	gulp.watch(source.watch.image, gulp.series('less')).on("change", browserSync.stream);
});

gulp.task('watch:less', gulp.parallel('less', function() {
	gulp.watch([...source.watch.styles, ...source.watch.content], {ignoreInitial: true}, gulp.series('less'));
}));

function browserWatch(done) {
	browserSync.init({
		proxy: "http://localhost/cv2/public",
		notify: false,
		port: 8000
	});
	done();
}

gulp.task('watch', gulp.parallel(browserWatch, 'watch:html', 'watch:image', 'watch:less'));


//default
gulp.task('default', gulp.parallel('less'));


// Error handler.
function plumbError() {
	return plumber({
		errorHandler: function(err) {
			notify.onError({
				templateOptions: {
					date: new Date()
				},
				title: 'Less',
				message: err.message,
				sound: "Frog",
				timeout: 15,
			})(err);

			this.emit('end');
		}
	})
}

function processLess() {
	let combined = combiner.obj([
		sourceMaps.init(),
		less(),
		postcss([
			postcssImport(),
			postcssAssets({
				loadPaths: source.image,
				cachebuster: true,
				relative: true
			}),
			postcssCalc(),
			postcssPresetEnv({stage: 2}),
			tailwindcssNesting(),
			tailwindcss(),
			autoPrefix(),
		]),
		isProduction ? cleanCSS({debug: true}, (details) => {
			log.info(`minimizing css: ${details.name} ${details.stats.originalSize} => ${details.stats.minifiedSize}`);
		}) : null,
		size({
			title: 'css: ',
			gzip: true,
			uncompressed: true,
			showTotal: false,
			showFiles: true
		}),
		sourceMaps.write('.'),
	].filter(v => v));

	// any errors in the above streams will get caught by this listener, instead of being thrown:
	combined.on('error', function(err) {
		log.error('--------------');
		log.error('fileName: ' + err.fileName + ': ' + err.lineNumber );
		log.error('message: ' + err.message);
		//log.error('plugin: ' + err.plugin);
	});

	return combined;
}
