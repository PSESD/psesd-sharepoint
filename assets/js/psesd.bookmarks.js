function PsesdBookmarks($element, settings) {
	var self = this;
	this.initialized = false;
	this.$element = $element.hide();
	this.settings = jQuery.extend(true, {}, this.defaultSettings, settings);
	this.elements = {};
	this.elements.$canvas = $("<div />", {'class': 'psesd-bookmarks-canvas'}).appendTo(this.$element);
	this.elements.$list = $("<ul />", {'class': 'psesd-bookmarks-list'}).appendTo(this.elements.$canvas);
	this.sites = false;
	this.bookmarks = false;
	this.bookmarksList = false;
	sharepointLoadedDeferred.done(function() {
		self.dataService = new SPScript.RestDao('');
		self.bookmarksList = self.dataService.lists("Team Site Bookmarks");
	});

	this.initSites();
	this.initBookmarks();
}

PsesdBookmarks.prototype.defaultSettings = {
	'initSampleSize': 3,
	'badSiteIds': [
		'164835824', // contenttypehub
		'265449892', // team site container
		'164835818', // pugetsoundesd.sharepoint.com root
		'336706119', // departments container
		'289763762', // projects container
		'45740822', // point publishing (video) site
		'45740823', // community site
		'0'
	]
};


PsesdBookmarks.prototype.render = function() {
	var self = this;
	if (!this.isReady()) {
		this.$element.hide();
		return false;
	}
	if (this.bookmarks.length === 0) {
		this.fillSiteSample();
	}
	// alert(JSON.stringify(this.bookmarks));
	this.elements.$list.html('');
	var hasHiddenBookmarks = false;
	var $activeItem = false;
	var activeItemString = false;
	jQuery.each(this.sites, function(siteId, site) {
		var $element = $("<li />").addClass('psesd-bookmarks-item').appendTo(self.elements.$list);
		$element.attr('data-site-id', siteId);
		if (jQuery.inArray(siteId, self.bookmarks) > -1) {
			$element.addClass('psesd-bookmarks-bookmark');
		} else {
			hasHiddenBookmarks = true;
		}
		var $link = $("<a />", {'href': site.url}).html(site.title).appendTo($element);
		if (decodeURIComponent(window.location.href).substr(0, site.url.length) === site.url) {
			if ($activeItem) {
				// current active item exists
				if (site.url.length > activeItemString.length) {
					$activeItem.removeClass('active');
					$activeItem.parent('li').removeClass('psesd-bookmarks-active');
					$activeItem = $link;
					activeItemString = site.url;
					$link.addClass('active');
					$activeItem.parent('li').addClass('psesd-bookmarks-active');
				}
			} else {
				// set active item
				$activeItem = $link;
				activeItemString = site.url;
				$link.addClass('active');
				$activeItem.parent('li').addClass('psesd-bookmarks-active');
			}
		}
		var $linkStarContainer = $("<span />", {'class': 'psesd-bookmark-indicator'}).appendTo($link);
		var $linkStar = $("<span />", {'class': 'fa fa-star'}).appendTo($linkStarContainer);
		$link.click(function() {
			if (!self.elements.$list.hasClass('psesd-bookmarks-manage')) {
				return true;
			}
			if ($element.hasClass('psesd-bookmarks-bookmark')) {
				// remove bookmark
				$element.removeClass('psesd-bookmarks-bookmark');
				self.bookmarks.jomRemoveElement(siteId);
			} else {
				// add bookmark
				$element.addClass('psesd-bookmarks-bookmark');
				self.bookmarks.push(siteId);
			}
			return false;
		});
	});
	if (hasHiddenBookmarks) {
		var $manageElement = $("<li />", {'class': 'psesd-bookmarks-manage-button'}).appendTo(self.elements.$list);
		var $manageLink = $("<a />", {'href': '#', 'title': 'Manage'}).html('Manage Favorites').appendTo($manageElement);

		var $moreElement = $("<li />", {'class': 'psesd-bookmarks-more'}).appendTo(self.elements.$list);
		var $moreLink = $("<a />", {'href': '#', 'title': 'More...'}).appendTo($moreElement);
		var $moreChevron = $("<span />", {'class': 'fa fa-chevron-down'}).appendTo($moreLink);
		$moreLink.click(function() {
			self.elements.$list.toggleClass('psesd-bookmarks-all');
			if ($moreChevron.hasClass('fa-chevron-down')) {
				$moreChevron.removeClass('fa-chevron-down').addClass('fa-chevron-up');
			} else {
				$moreChevron.removeClass('fa-chevron-up').addClass('fa-chevron-down');
			}
		});

		$manageLink.click(function() {
			self.elements.$list.toggleClass('psesd-bookmarks-manage');
			if (self.elements.$list.hasClass('psesd-bookmarks-manage')) {
				$manageLink.html('Save');
				$moreElement.hide();
			} else {
				$manageLink.html('Manage Favorites');
				self.saveBookmarks();
				$moreElement.show();
			}
		});
	}
	this.$element.show();
	this.initialized = true;
	this.saveLocalData();
};

PsesdBookmarks.prototype.fillSiteSample = function() {
	var self = this;
	var attempts = this.settings.initSampleSize + 5;
	var randomSite = null;
	while(self.bookmarks.length < this.settings.initSampleSize) {
		if (attempts < 1) {
			break;
		}
		randomSite = self.pullRandomSite();
		if (!randomSite) {
			break;
		}
		if (jQuery.inArray(randomSite, self.bookmarks) === -1) {
			self.bookmarks.push(randomSite);
		}
		attempts--;
	}
	this.saveBookmarks();
};

PsesdBookmarks.prototype.saveBookmarks = function() {
	var self = this;
	this.loadBookmarks(function(currentBookmarks) {
		jQuery.each(self.bookmarks, function(index, bookmark) {
			if (jQuery.inArray(bookmark, currentBookmarks) === -1) {
				self.addBookmarkItem(bookmark);
			}
			currentBookmarks.jomRemoveElement(bookmark);
		});

		jQuery.each(currentBookmarks, function(index, bookmark) {
			self.deleteBookmarkItem(bookmark);
		});
	});
	this.saveLocalData();
};

PsesdBookmarks.prototype.saveLocalData = function() {
	var self = this;
	if (isLocalStorageSupported()) {
		localStorage.setItem('psesd.bookmarks', JSON.stringify(self.bookmarks));
		localStorage.setItem('psesd.teamSites', JSON.stringify(self.sites));
	}
};

PsesdBookmarks.prototype.deleteBookmarkItem = function(bookmark) {
	var self = this;
	var userId = _spPageContextInfo.userId;
	this.bookmarksList.getItems('$filter=AuthorId eq ' + userId +' and Site eq '+bookmark+'').then(function(bookmarkItems) {
		jQuery.each(bookmarkItems, function(index, bookmarkItem) {
//			console.log(['delete', bookmarkItem]);
			self.bookmarksList.deleteItem(bookmarkItem.Id);
		});
	});
};

PsesdBookmarks.prototype.addBookmarkItem = function(bookmark) {
	return this.bookmarksList.addItem({'Site': bookmark});
};

PsesdBookmarks.prototype.pullRandomSite = function() {
	var keys = Object.keys(this.sites);
	if (keys.length === 0) { return false; }
    return keys[Math.floor(keys.length * Math.random())];
}

PsesdBookmarks.prototype.isReady = function() {
	return this.sites && this.bookmarks;
};

PsesdBookmarks.prototype.initSites = function() {
	var self = this;
	// callback with packaged sites JSON object
	var finalSiteCallback = function (sites) {
		self.sites = sites;
		self.render();
	};

	if (isLocalStorageSupported() && localStorage.getItem('psesd.teamSites') !== null) {
		try {
			var teamSites = JSON.parse(localStorage.getItem('psesd.teamSites'));
			finalSiteCallback(teamSites, false);
		} catch (e) {
			// oh well
		}
	}

	// fetch sites
	sharepointLoadedDeferred.done(function() {
		var teamSites = {};
		var query = '(path:"'+ psesdSharepointUrl +'" contentclass:"STS_Site" contentclass:"STS_Web" (WebTemplate <> "GROUP" AND WebTemplate <> "APP")) NOT (path:"'+ mypsesdSharepointUrl +'")';
		var params = {};
		params.rowlimit = 200;
		params.trimduplicates = 'false';
		// params.selectproperties = '';
		// params.selectproperties = 'DisplayTitle,Title,Created,DocId,Path';
		params.sortlist = 'DisplayTitle:ascending,Created:descending';
		self.dataService.search.query(query, params).then(function(searchResults){
			jQuery.each(searchResults.items, function(index, item) {
				if (item.DocId === undefined || item.DocId === null) { return true; }
				if (jQuery.inArray(item.DocId, self.settings.badSiteIds) !== -1) { return true; }
				// console.log(['sites', item]);
				var site = {};
				site.id = item.DocId;
				site.title = item.Title;
				site.url = item.Path;
				teamSites[site.id] = site;
			});
			finalSiteCallback(teamSites, true);
		});
	});
};

PsesdBookmarks.prototype.initBookmarks = function() {
	var self = this;
	// callback with packaged sites JSON object
	var finalBookmarkCallback = function (bookmarks) {
		self.bookmarks = bookmarks;
		self.render();
	};

	if (isLocalStorageSupported() && localStorage.getItem('psesd.bookmarks') !== null) {
		try {
			var bookmarks = JSON.parse(localStorage.getItem('psesd.bookmarks'));
			finalBookmarkCallback(bookmarks);
		} catch (e) {
			// oh well
		}
	}
	this.loadBookmarks(finalBookmarkCallback);
};

PsesdBookmarks.prototype.loadBookmarks = function(callback) {
	var self = this;

	// fetch bookmarks
	return sharepointLoadedDeferred.done(function() {
		var userId = _spPageContextInfo.userId;
		self.bookmarksList.getItems('$filter=AuthorId eq ' + userId).then(function(items) {
			var bookmarks = [];
			jQuery.each(items, function(index, item) {
				bookmarks.push(item.Site);
			});
			callback(bookmarks);
		});
	});
};

function __psesdLoadBookmarks() {
	$(".psesd-side-bookmarks").each(function() {
		if ($(this).closest('.ms-rtefield').length !== 0) {
			return;
		}
		var settings = {};
		$(this).data('bookmarks', new PsesdBookmarks($(this), settings));
	});
}

$(function() {
	__psesdLoadBookmarks();
});
