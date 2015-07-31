var psesdSharepointUrl = 'https://pugetsoundesd.sharepoint.com'
var mypsesdSharepointUrl = psesdSharepointUrl + '/my';
var sharepointLoadedDeferred = jQuery.Deferred();
var $agencyAppsDropdown = null;

mypsesdSitesCallbacks = jQuery.Callbacks("memory");
mypsesdSitesCallbacks.add(function(sites) {
	localStorage.setItem('psesd.mypsesdSites', JSON.stringify(sites));
});
mypsesdInitSites();

function mypsesdInitSites() {
	// callback with packaged sites JSON object
	var finalSiteCallback = function (sites) {
		mypsesdSitesCallbacks.fire(sites);
	};

	if (isLocalStorageSupported() && localStorage.getItem('psesd.mypsesdSites') !== null) {
		try {
			var mypsesdSites = JSON.parse(localStorage.getItem('psesd.mypsesdSites'));
			finalSiteCallback(mypsesdSites, false);
		} catch (e) {
			// oh well
		}
	}

	// fetch sites
	return sharepointLoadedDeferred.done(function() {
		var dataService = new SPScript.RestDao('');
		var mypsesdSitesList = dataService.lists("MyPSESD Sites");
		mypsesdSitesList.getItems().then(function(items) {
			var sites = {};
			jQuery.each(items, function(index, item) {
				if (item.URL === undefined) { return true; }
				sites[item.Id] = {
					'url': item['URL'].Url,
					'area': item['Agency_x0020_Area'],
					'title': item['Title']
				};
			});
			sites.getSiteByUrl = function(url) {
				var chosenSite = false;
				jQuery.each(this, function(index, site) {
					if (site.url === url) {
						chosenSite = site;
						return false;
					}
				});
				if (!chosenSite) {
					console.log(['site not found', url, sites]);
				}
				return chosenSite;
			};
			finalSiteCallback(sites);
		});
	});

};

$(window).resize(function () {
    waitForFinalEvent(function(){
    	$(this).trigger("resizeDone");
    }, 500, "window-resize-event");
});


SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function() {
	sharepointLoadedDeferred.resolve();
});

function isMyPSESD() {
	var urlParts = window.location.pathname.replace(/^\//, '').split('/');
	return urlParts[0] === undefined || urlParts[0] === 'my' || urlParts[0] === 'SitePages';
}

function isPSESDStaff() {
	return true;
}

function __psesd_core() {
	$agencyAppsDropdown = $("<div />", {'class': 'psesd-apps-dropdown'}).hide();
	var $contentBox = $("#contentBox");
	var $mypsesdNav = $(".psesd-mypsesd-sites-nav");
	var $teamNav = $(".psesd-side-bookmarks");
	var $breadcrumb = $(".psesd-breadcrumb");
	var $mypsesdNavList = $mypsesdNav.find('ul');
	var $activeItem = false;
	var activeItemString = false;
	var $lastBreadcrumb = false;
	$(".psesd-breadcrumb .breadcrumbNode").reverse().each(function() {
		if ($(this).attr('href') === _spPageContextInfo.webServerRelativeUrl + '/SitePages/Home.aspx') {
			$lastBreadcrumb = false;
			return true;
		}

		if (!$lastBreadcrumb) {
			$lastBreadcrumb = $(this);
			return true;
		}
	});
	if ($lastBreadcrumb) {
		$lastBreadcrumb.parent('span').parent('span').find('span').remove();
		$lastBreadcrumb.parent('span').show().parent('span').show();
		$lastBreadcrumb.appendTo($breadcrumb);
		$lastBreadcrumb.prepend($("<span />", {'class': 'fa fa-chevron-circle-left'}));
		if ($lastBreadcrumb.attr('href') === '/my/Pages/Home.aspx') {
			$lastBreadcrumb.attr('href', psesdSharepointUrl);
		}
		$breadcrumb.show();
	}
	if (isMyPSESD()) {
		$(".ms-core-listMenu-item:contains('Recent')").parent().hide();
		$(".ms-core-listMenu-item:contains('Updated Pages')").parent().hide();
		$(".ms-core-navigation hr").hide();
		//console.log("MYPSESD!");
		$mypsesdNavList.find('a').each(function() {
			var url = $(this).attr('href');
			if (decodeURIComponent(window.location.href).substr(0, url.length) === url) {
				if ($activeItem) {
					// current active item exists
					if (url.length > activeItemString.length) {
						$activeItem.removeClass('active');
						$activeItem = $(this);
						activeItemString = url;
						$(this).addClass('active');
					}
				} else {
					// set active item
					$activeItem = $(this);
					activeItemString = url;
					$(this).addClass('active');
				}
			}
		});
	} else if (!isPSESDStaff()) {
		$(".psesd-mypsesd-sites-nav").remove();
	} else {
		//console.log("NOT MYPSESD!");
		$(".psesd-mypsesd-sites-nav").find('li').remove();
		var $mypsesdNavItem = $("<li />", {}).appendTo($mypsesdNav);
		var $mypsesdNavContainer= $("<div />", {'class': 'link-item'}).appendTo($mypsesdNavItem);
		var $mypsesdLink = $("<a />", {'href': psesdSharepointUrl}).html('MyPSESD').appendTo($mypsesdNavContainer);
	}
	$mypsesdNav.show();

	$(document).on('click', ".psesd-disable-click", function() { return false; });
	$(document).on('click', ":not(.psesd-apps-dropdown):not(.psesd-apps-dropdown *)", function() { $agencyAppsDropdown.slideUp(100); });
	//$agencyAppsDropdown.appendTo($('body'));
	//$('.psesd-agency-apps-list').show().appendTo($agencyAppsDropdown);
	//$agencyAppsDropdown.find('a').attr('target', '_blank');

	$(window).on('resizeDone', function() {
		var $searchInput = $(".ms-srch-sbLarge-navWidth");
		var $parentBox = $searchInput.closest('.ms-webpart-chrome-fullWidth');
		$searchInput.width(parseInt($parentBox.width(), 10) - 80);
	});

	$(window).trigger("resizeDone");
	$(".psesd-toc").toc({
		'selectors': 'h1,h2,h3,h4,h5', //elements to use as headings
	    'container': '#contentBox .article-content', //element to find all selectors in
		'smoothScrolling': true, //enable or disable smooth scrolling on click
	    'prefix': 'toc', //prefix for anchor tags and class names
	    'onHighlight': function(el) {}, //called when a new section is highlighted
	    'highlightOnScroll': true, //add class to heading that is currently in focus
	    'highlightOffset': 100,
		'itemClass': function(i, heading, $heading, prefix) { // custom function for item class
		  return 'toc-level-' + $heading[0].tagName.toLowerCase();
		},
		'anchorName': function(i, heading, prefix) { //custom function for anchor name
	        return prefix+i;
	    }
	}).removeClass('psesd-toc-preload');
	$(".psesd-toc").each(function() {
		var $title = $("<div />", {'class': 'psesd-toc-title'}).html('Contents').prependTo($(this));
	});
}

$(function() {
	__psesd_core();
});

	sharepointLoadedDeferred.done(function() {
		var $topNavHeader = $("#O365_NavHeader");
		var $topHeaderItems = $topNavHeader.find('.o365cs-nav-leftAlign');
		var $siteNav = $(".psesd-site-nav");
		// var $agencyAppsItem = $("<div />", {'class': 'o365cs-nav-topItem psesd-agency-apps'}).prependTo($topHeaderItems);
		// var $agencyAppsButton = $("<button />", {'class': 'o365cs-nav-item o365cs-nav-button o365cs-navMenuButton ms-bgc-tdr-h o365button ms-bgc-tp', 'title': 'Agency Applications'}).appendTo($agencyAppsItem);
		// var $agencyAppsIcon = $("<img />", {'src': '/SiteAssets/psesd-drop-white.png'}).appendTo($agencyAppsButton);
		// var itemPosition = $agencyAppsItem.position();
		// var itemHeight = $agencyAppsItem.height();
		// $agencyAppsDropdown.css({'top': parseInt(itemHeight, 10)});
		// $agencyAppsButton.click(function() {
		// 	$agencyAppsDropdown.slideToggle(150);
		// 	return false;
		// });

		if (SP.Ribbon !== undefined && SP.Ribbon.PageState.Handlers.isInEditMode()) {
			return true;
		}
		if ($siteNav.find('li').length === 0) {
			$siteNav.remove();
		}
	});
