/**
 * Created by Damie on 4/17/2017.
 */
module.exports = function (grunt) {
    grunt.initConfig({
        download: {
            chromewebdriver_windows: {
                url: "https://chromedriver.storage.googleapis.com/2.29/chromedriver_win32.zip",
                filename: "chromedriver/"
            },
            chromewebdriver_linux32: {
                url: "https://chromedriver.storage.googleapis.com/2.29/chromedriver_linux32.zip",
                filename: "chromedriver/"
            },
            chromewebdriver_linux64: {
                url: "https://chromedriver.storage.googleapis.com/2.29/chromedriver_linux64.zip",
                filename: "chromedriver/"
            },
            chromewebdriver_mac: {
                url: "https://chromedriver.storage.googleapis.com/2.29/chromedriver_mac64.zip",
                filename: "chromedriver/"
            },
        },
        unzip: {
            windows: {
                "chromewebdriver/chrome": "chromedriver/chromedriver.zip"
            },
            linux: {
                "/usr/bin/google-chrome": "chromedriver/chromedriver.zip"
            },
            mac: {
                "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome" : "chromedriver/chromedriver.zip"
            }
        },
        move: {
            rename: {
                src: [
                    "chromedriver/chromedriver_mac64.zip",
                    "chromedriver/chromedriver_linux64.zip",
                    "chromedriver/chromedriver_linux32.zip",
                    "chromedriver/chromedriver_win32.zip"
                ],
                dest: "chromedriver/chromedriver.zip"
            }
        },
        mkdir: {
            chromedriver: {
                options: {
                    create: ["chromedriver"]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-zip");
    grunt.loadNpmTasks("grunt-download");
    grunt.loadNpmTasks("grunt-mkdir");

    //Tasks for downloading chromedriver dependency for Selenium. https://github.com/SeleniumHQ/selenium/wiki/ChromeDriver
    grunt.registerTask("linux32-install", ["mkdir:chromedriver", "download:chromewebdriver_linux32", "move", "unzip"]);
    grunt.registerTask("linux64-install", ["mkdir:chromedriver", "download:chromewebdriver_linux64", "move", "unzip"]);
    grunt.registerTask("windows-install", ["mkdir:chromedriver", "download:chromewebdriver_windows", "move", "unzip"]);
    grunt.registerTask("mac-install", ["mkdir:chromedriver", "download:chromewebdriver_mac", "move", "unzip"]);
};