function PsesdNewsfeed($element, settings) {
	var self = this;
	this.$element = $element;

	this.settings = jQuery.extend(true, {}, this.defaultSettings, settings);
	this.elements = {};
	this.elements.$canvas = $("<div />", {'class': 'psesd-newsfeed'}).appendTo(this.$element);
	this.elements.$title = $("<h2 />", {'class': 'psesd-newsfeed-title ms-webpart-titleText'}).html(this.settings.title).appendTo(this.elements.$canvas);
	if (this.settings.manageUrl) {
		this.checkManagePermissions(function() {

			self.elements.$manageUrl = $("<a />", {'href': self.settings.manageUrl, 'class': 'psesd-button psesd-button-sm pull-right'}).html("Manage").prependTo(self.elements.$title);
		});
	}


	this.elements.$results = $("<div />", {'class': 'psesd-newsfeed-results'}).show().appendTo(this.elements.$canvas);
	this.elements.$stickyResults = $("<ul />", {'class': 'psesd-newsfeed-results-list psesd-newsfeed-results-list-sticky'}).appendTo(this.elements.$results);
	this.elements.$normalResults = $("<ul />", {'class': 'psesd-newsfeed-results-list psesd-newsfeed-results-list-normal'}).appendTo(this.elements.$results);
	this.elements.$loading = $("<div />", {'class': 'psesd-newsfeed-loading'}).appendTo(this.elements.$canvas);
	this.elements.$empty = $("<div />", {'class': 'psesd-newsfeed-empty'}).html('There are no announcements at this time.').hide().appendTo(this.elements.$canvas);
	this.resources = {'stickyResults': false, 'normalResults': false, 'isReady': false};
	if (this.settings.subsite) {
		this.elements.$canvas.addClass('psesd-timeline-nosite');
	}
	this.initLoading();


	sharepointLoadedDeferred.done(function() {
		self.dataService = new SPScript.RestDao('');
		self.triggerResourceChangeTimeout = null;
		// self.loadWebSites();
		self.loadAnnouncements(true);
		self.loadAnnouncements(false);
	});

	// this.initList(this.elements.$normalResults, false);
}

PsesdNewsfeed.prototype.defaultSettings = {
	'title': 'Announcements',
	'loadingCount': 15,
	'subsite': false,
	'manageUrl': false
};

PsesdNewsfeed.prototype.init = function() {
	this.update();
	this.elements.$loading.hide();
	this.elements.$results.show();
}
PsesdNewsfeed.prototype.getCurrentUser = function() {
	if (this._currentUser === undefined) {
		var context = new SP.ClientContext.get_current();
    	var web = context.get_web();
    	this._currentUser = web.get_currentUser();
	}
	return this._currentUser;
}

PsesdNewsfeed.prototype.checkManagePermissions = function(callback) {
	var self = this;
	sharepointLoadedDeferred.done(function() {
		var context = new SP.ClientContext.get_current();
		var web = context.get_web();
	    context.load(self.getCurrentUser());
	    context.load(web,'EffectiveBasePermissions');
	    var successCallback = function onSuccessMethod(sender, args) {
	        if (web.get_effectiveBasePermissions().has(SP.PermissionKind.editListItems)) {
	        	callback();
	        }
	    };
	    context.executeQueryAsync(Function.createDelegate(self, successCallback), Function.createDelegate(self, function() { console.log("perm fail"); }));        
	});
}
PsesdNewsfeed.prototype.initLoading = function() {
	this.elements.$loadingResults = $("<ul />", {'class': 'psesd-newsfeed-results-list psesd-newsfeed-results-list-normal'}).appendTo(this.elements.$loading);
	for (i = 0; i < this.settings.loadingCount; i++) {
		var animationDelay = Math.random();
		var item = {'SiteTitle': '<div class="psesd-newsfeed-dummy-text" style="width: '+ Math.floor((Math.random() * 50) + 70) +'px;; animation-delay: '+animationDelay+'s;"></div>', 'DatePlace': '<div class="psesd-newsfeed-dummy-text" style="width: 100px; animation-delay: '+animationDelay+'s;"></div>', 'Title': '<div class="psesd-newsfeed-dummy-text" style="width: '+ Math.floor((Math.random() * 200) + 150) +'px; animation-delay: '+animationDelay+'s;"></div>'};
		item.$element = $("<li />").appendTo(this.elements.$loadingResults);
		item.elements = {};
		item.elements.$sticky = $("<div />", {'class': 'psesd-timeline-item-sticky psesd-timeline-item-dark'}).appendTo(item.$element);
		item.elements.$site = $("<a />", {'href': '#'}).html(item.SiteTitle).addClass('psesd-disable-click psesd-timeline-item-dark psesd-timeline-item-site').appendTo(item.$element);
		item.elements.$title = $("<a />", {'href': '#'}).html(item.Title).addClass('psesd-disable-click psesd-timeline-item-light psesd-timeline-item-title').appendTo(item.$element);
		item.elements.$content = $("<div />", {'title': 'Date Posted'}).html(item.DatePlace).addClass('psesd-timeline-item-date').prependTo(item.elements.$title);
	}
}

PsesdNewsfeed.prototype.update = function() {
	var hasItems = false;
	this.renderList(this.elements.$stickyResults, this.resources.stickyResults, true);
	this.renderList(this.elements.$normalResults, this.resources.normalResults, false);

	if (this.elements.$stickyResults.find('li').length === 0) {
		this.elements.$stickyResults.hide();
	} else {
		hasItems = true;
	}

	if (this.elements.$normalResults.find('li').length === 0) {
		this.elements.$normalResults.hide();
	} else {
		hasItems = true;
	}

	if (!hasItems) {
		this.elements.$empty.show();
	} else {
		this.elements.$empty.hide();
	}
}

PsesdNewsfeed.prototype.renderList = function($list, resource, isSticky) {
	jQuery.each(resource.items, function(index, item) {
		if (!item.$element) {
			item.$element = $("<li />");
			item.elements = {};
			item.elements.$sticky = $("<div />", {'class': 'psesd-timeline-item-sticky psesd-timeline-item-dark'}).appendTo(item.$element);
			if (isSticky) {
				item.elements.$sticky.html("<span class='fa fa-exclamation'></span>");
			}
			item.elements.$site = $("<a />", {'href': item.SPWebUrl}).html(item.SiteTitle).addClass('psesd-timeline-item-dark psesd-timeline-item-site').appendTo(item.$element);
			item.elements.$title = $("<a />", {'href': item.OriginalPath}).html(item.Title).addClass('psesd-timeline-item-light psesd-timeline-item-title').appendTo(item.$element);
			if (item.AnnouncementUrl) {
				item.elements.$title.attr('href', item.AnnouncementUrl);
			}
			var date = new Date(item.Created);
			var dateOptions = {
			    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
			};
			item.elements.$content = $("<div />", {'title': 'Date Posted'}).html(date.toLocaleTimeString("en-US", dateOptions)).addClass('psesd-timeline-item-date').prependTo(item.elements.$title);
			//item.elements.$content = $("<div />", {}).html(item.BodyOWSMTXT).addClass('psesd-timeline-item-content').appendTo(item.$element);
		}
		item.$element.appendTo($list);
	});
}

PsesdNewsfeed.prototype.loadWebSites = function() {
	this.dataService.web.subsites().then(function(subsites) {
		console.log(['subsites', subsites]);
	});
};

PsesdNewsfeed.prototype.triggerResourceChange = function() {
	var self = this;
	var currentIsReady = this.resources.isReady;
	clearTimeout(this.triggerResourceChangeTimeout);
	this.triggerResourceChangeTimeout = setTimeout(function() {
		if (self.resources.stickyResults && self.resources.normalResults) {
			if (currentIsReady) {
				self.update();
			} else {
				self.init();
			}
		}
	}, 500);
};


PsesdNewsfeed.prototype.loadAnnouncements = function(isSticky, rowOffset) {
	var self = this;

	var query = 'ContentTypeId:0x0104* AND PostDate <= today AND NOT (Expires < today)'; // AND PostDateOWSDATE <= today
	if (this.settings.subsite) {
		var clientContext = SP.ClientContext.get_current();
		query = 'path:https://pugetsoundesd.sharepoint.com' + clientContext.get_url() + '/* ' + query;
	}
	var params = {};
	
	if (isSticky) {
		var resourceId = 'stickyResults';
		query = query + ' AND (StickyUntil >= today)';
		params.rowlimit = 100;
	} else {
		var resourceId = 'normalResults';
		query = query + ' AND (NOT (StickyUntil >= today))';
		params.rowlimit = 40;
		if (rowOffset === undefined) {
			rowOffset = 0;
		}
		params.startrow = rowOffset;
	}
	
	params.selectproperties = 'SPWebUrl,OWS_URL,AnnouncementUrl,UniqueId,OriginalPath,Title,BodyOWSMTXT,Created,Author,AuthorUserId,EditorOWSUSER,PostDate,StickyUntil,Expires,SiteName,SiteTitle';
	params.sortlist = 'PostDate:descending,Created:descending';

	this.dataService.search.query(query, params).then(function(searchResults){
		if (self.resources[resourceId] === false) {
			self.resources[resourceId] = {'currentPage': 0, 'items': {}};
		}
		self.resources[resourceId].currentPage = rowOffset;
		jQuery.each(searchResults.items, function (index, item) {
			if (self.resources[resourceId].items[item.UniqueId] !== undefined) {
				return true;
			}
			self.resources[resourceId]['items'][item.UniqueId] = {};
			self.resources[resourceId]['items'][item.UniqueId] = item;
			self.resources[resourceId]['items'][item.UniqueId].$element = false;
		});
		self.triggerResourceChange();
	});
};

function __psesdLoadNewsfeed() {
	if (SP.Ribbon !== undefined && SP.Ribbon.PageState.Handlers.isInEditMode()) {
		return;
	}
	$(".psesd-newsfeed").each(function() {
		if ($(this).closest('.ms-rtefield').length !== 0) {
			return;
		}
		var settings = {};
		if ($(this).hasClass('psesd-newsfeed-subsite')) {
			settings.subsite = true;
		}
		if ($(this).data('newsfeed-manage')) {
			settings.manageUrl = $(this).data('newsfeed-manage');
		}
		$(this).data('newsfeed', new PsesdNewsfeed($(this), settings));
	});
}

$(function() {
	__psesdLoadNewsfeed();
});