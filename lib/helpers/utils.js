/* eslint-disable no-magic-numbers */
"use strict";

const fsAsync = require("fs").promises;
const fs = require("fs");
const path = require("path");

/**
* Check for intersection two arrays
* @param {Array} arr1 array to 
* @param {Array} arr2 second array to combare against
* @returns {boolean} is intersecting
*/
exports.arraysHasIntersect = (arr1, arr2) => {
	let data = Array.isArray(arr1) ? arr1 : [arr1];
	for (const item of data)
		if (arr2.indexOf(item) != -1) return true;
	return false;
};

exports.arraysIntersect = (arr1, arr2) => {
	let output = [];
	for (const item of arr1)
		if (arr2.indexOf(item) != -1) output.push(item);
	return output;
};

/**
* Check for intersection of array values against string
* @param {string} string string to be checked for intersection
* @param {string} arr1 values to check
* @returns {boolean} is intersecting
*/
exports.stringHasIntersect = (string, arr) => {
	arr.forEach(item => {
		if (string.indexOf(item) !== -1) return true;
	});
	return false;
};

/**
* Load JSON file in async style
* @param {string} path path to file
* @param {string} encoding file encoding
* @returns {Object|false} return false if failed or Object if successful
*/
exports.loadJsonAsync = async (path, encoding = "utf8") => {
	let result = false;
	try {
		result = await fsAsync.readFile(path, encoding);
	}
	// eslint-disable-next-line no-empty
	catch (ex) { }
	if (result) result = JSON.parse(result);

	return result;
};

/**
* Get full path string
* @param {string} str1 resolve elem 1
* @param {string} str2 relative path
* @returns {string} full path
*/
exports.getFullPath = (str1, str2) => path.resolve(str1, str2);

/**
* Load JSON file iin sync way
* @param {string} path path to file
* @param {string} encoding file encoding
* @returns {Object|false} return false if failed or Object if successful
*/
exports.loadJson = (path, encoding = "utf8") => {
	try {
		return JSON.parse(fs.readFileSync(path, encoding));
	} catch (err) {
		return false;
	}
};

/**
* Save JSON file synchronously with format
* @param {string} obj object to save
* @param {string} path path
* @returns {undefined|false} returns false if error happened
*/
exports.saveJson = (obj, path) => {
	try {
		fs.writeFileSync(path, JSON.stringify(obj, null, "\t"));
	} catch (err) {
		return false;
	}
};