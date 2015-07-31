var psesdDocumentsAgencyDocsSettings = {
	'fetch': function(self, callback) {
		var query = 'path:"'+ mypsesdSharepointUrl +'"  (Tags:"Agency Documents") (IsDocument:"True")'; //
		self.fetchDocuments(query, callback);
	}
};

function PsesdDocuments($element, settings) {
	var self = this;
	this.$element = $element;

	this.settings = jQuery.extend(true, {}, this.defaultSettings, settings);
	this.elements = {};
	this.elements.$canvas = $("<div />", {'class': 'psesd-documents'}).appendTo(this.$element);
	// this.elements.$title = $("<h2 />", {'class': 'psesd-documents-title ms-webpart-titleText'}).html(this.settings.title).appendTo(this.elements.$canvas);

	this.elements.$results = $("<div />", {'class': 'psesd-documents-results'}).show().appendTo(this.elements.$canvas);
	this.elements.$loading = $("<div />", {'class': 'psesd-documents-loading'}).appendTo(this.elements.$canvas);
	this.elements.$empty = $("<div />", {'class': 'psesd-documents-empty'}).html('There are no documents at this time.').hide().appendTo(this.elements.$canvas);
	this.resources = false;
	if (this.settings.subsite) {
		this.elements.$canvas.addClass('psesd-documents-nosite');
	}
	this.initLoading();

	sharepointLoadedDeferred.done(function() {
		self.dataService = new SPScript.RestDao('');
		self.triggerResourceChangeTimeout = null;
		self.settings.fetch(self, function(items) {
			//console.log(['finalItems', items]);
		});
	});

	// this.initList(this.elements.$normalResults, false);
}

PsesdDocuments.prototype.defaultSettings = {
	'title': 'Documents',
	'loadingCount': 15,
	'callback': function(items) {

	}
};

PsesdDocuments.prototype.init = function() {
	this.update();
	this.elements.$loading.hide();
	this.elements.$results.show();
}



PsesdDocuments.prototype.getCurrentUser = function() {
	if (this._currentUser === undefined) {
		var context = new SP.ClientContext.get_current();
    	var web = context.get_web();
    	this._currentUser = web.get_currentUser();
	}
	return this._currentUser;
}

PsesdDocuments.prototype.initLoading = function() {
	this.elements.$loadingResults = $("<ul />", {'class': 'psesd-documents-results-list psesd-documents-results-list-normal'}).appendTo(this.elements.$loading);
	for (i = 0; i < this.settings.loadingCount; i++) {
		var animationDelay = Math.random();
		var item = {'SiteTitle': '<div class="psesd-documents-dummy-text" style="width: '+ Math.floor((Math.random() * 50) + 70) +'px;; animation-delay: '+animationDelay+'s;"></div>', 'DatePlace': '<div class="psesd-documents-dummy-text" style="width: 100px; animation-delay: '+animationDelay+'s;"></div>', 'Title': '<div class="psesd-documents-dummy-text" style="width: '+ Math.floor((Math.random() * 200) + 150) +'px; animation-delay: '+animationDelay+'s;"></div>'};
		item.$element = $("<li />").addClass('clearfix').appendTo(this.elements.$loadingResults);
		item.elements = {};
		item.elements.$sticky = $("<div />", {'class': 'psesd-documents-item-sticky psesd-documents-item-dark'}).appendTo(item.$element);
		item.elements.$site = $("<a />", {'href': '#'}).html(item.SiteTitle).addClass('psesd-disable-click psesd-documents-item-dark psesd-documents-item-site').appendTo(item.$element);
		item.elements.$title = $("<a />", {'href': '#'}).html(item.Title).addClass('psesd-disable-click psesd-documents-item-light psesd-documents-item-title').appendTo(item.$element);
		item.elements.$content = $("<div />", {'title': 'Date Posted'}).html(item.DatePlace).addClass('psesd-documents-item-date').prependTo(item.elements.$title);
	}
}

PsesdDocuments.prototype.update = function() {
	var self = this;
	var resources = [];
	jQuery.each(this.resources, function(url, resource) {
		resources.push(resource);
	});
	resources.sort(function(a, b) {
		var aName = a.site.title.toLowerCase();
		var bName = b.site.title.toLowerCase();
		return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
	});
	jQuery.each(resources, function(i, resource) {
		self.renderList(self.elements.$results, resource);
	});
	self.elements.$results.addClass('grid').masonry({ 'itemSelector': '.grid-item', columnWidth: 350 });
}

PsesdDocuments.prototype.renderList = function($canvas, resource) {
	var self = this;

	resource.$element = $("<div />", {'class': 'grid-item'}).appendTo($canvas);
	resource.$canvas = $("<div />", {'class': 'psesd-documents-site'}).appendTo(resource.$element);
	resource.$canvas.addClass('psesd-area-' + resource.site.area);
	resource.elements = {};
	resource.elements.$header = $("<h2 />").appendTo(resource.$canvas);
	resource.elements.$site = $("<a />", {'href': resource.site.url}).html(resource.site.title).appendTo(resource.elements.$header);
	resource.elements.$list = $("<ul />").appendTo(resource.$canvas);
	jQuery.each(resource.items, function(i, item) {
		var $item = $("<li />").appendTo(resource.elements.$list);
		var $link = $("<a />", {'href': item.url}).html(item.title).appendTo($item);
	});
}

PsesdDocuments.prototype.triggerResourceChange = function() {
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


PsesdDocuments.prototype.fetchDocuments = function(query, callback) {
	var self = this;
	var params = {};
	params.rowlimit = 200;

	params.selectproperties = 'SPWebUrl,Title,Path,SiteTitle,Site_Title,Filename';
	params.sortlist = 'Filename:ascending';

	this.dataService.search.query(query, params).then(function(searchResults){
		var siteResults = {};
		console.log(['results', searchResults.items]);
		jQuery.each(searchResults.items, function(index, result) {
			if (siteResults[result.SPWebUrl] === undefined) {
				siteResults[result.SPWebUrl] = {'site': {'url': result.SPWebUrl, 'title': result.SiteTitle, 'area': 'Primary-Administration'}, 'items': []};
			}
			//console.log([index, result]);
			siteResults[result.SPWebUrl].items.push({
				'title': result.Filename.substr(0, result.Filename.lastIndexOf('.')),
				'url': result.Path
			});
		});
		mypsesdSitesCallbacks.add(function(sites) {
			jQuery.each(siteResults, function(url, documents) {
				var site = sites.getSiteByUrl(url);
				if (site) {
					siteResults[url].site = site;
				}
			});
			self.resources = siteResults;
			self.init();
		});
		self.triggerResourceChange();
	});
};

function __psesdLoadDocuments() {
	if (SP.Ribbon !== undefined && SP.Ribbon.PageState.Handlers.isInEditMode()) {
		return;
	}
	$(".psesd-documents").each(function() {
		if ($(this).closest('.ms-rtefield').length !== 0) {
			return;
		}
		var settings = false;
		if ($(this).hasClass('psesd-documents-agency-docs')) {
			settings = psesdDocumentsAgencyDocsSettings;
		}
		if (settings) {
			$(this).data('documents', new PsesdDocuments($(this), settings));
		}
	});
}

$(function() {
	__psesdLoadDocuments();
});
