var sharepointLoadedDeferred = jQuery.Deferred();
var $agencyAppsDropdown = $("<div />", {'class': 'psesd-apps-dropdown'}).hide();


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

function __psesd_core() {
	var $contentBox = $("#contentBox");
	var $mypsesdNav = $(".psesd-mypsesd-sites-nav");
	var $teamNav = $(".psesd-side-bookmarks");
	var $mypsesdNavList = $mypsesdNav.find('ul');
	var $activeItem = false;
	var activeItemString = false;

	if (isMyPSESD()) {
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
	} else {
		//console.log("NOT MYPSESD!");
		$(".psesd-mypsesd-sites-nav").find('li').remove();
		var $mypsesdNavItem = $("<li />", {}).appendTo($mypsesdNav);
		var $mypsesdNavContainer= $("<div />", {'class': 'link-item'}).appendTo($mypsesdNavItem);
		var $mypsesdLink = $("<a />", {'href': 'https://pugetsoundesd.sharepoint.com'}).html('MyPSESD').appendTo($mypsesdNavContainer);
	}
	$mypsesdNav.show();

	$(document).on('click', ".psesd-disable-click", function() { return false; });
	$(document).on('click', ":not(.psesd-apps-dropdown):not(.psesd-apps-dropdown *)", function() { $agencyAppsDropdown.slideUp(100); });
	$agencyAppsDropdown.appendTo($('body'));
	$('.psesd-agency-apps-list').show().appendTo($agencyAppsDropdown);
	$agencyAppsDropdown.find('a').attr('target', '_blank');

	$(window).on('resizeDone', function() {
		var $searchInput = $(".ms-srch-sbLarge-navWidth");
		var $parentBox = $searchInput.closest('.ms-webpart-chrome-fullWidth');
		$searchInput.width(parseInt($parentBox.width(), 10) - 80);
	});

	$(window).trigger("resizeDone");
}

$(function() {
	__psesd_core();
});

	sharepointLoadedDeferred.done(function() {
		var $topNavHeader = $("#O365_NavHeader");
		var $topHeaderItems = $topNavHeader.find('.o365cs-nav-leftAlign');
		var $siteNav = $(".psesd-mypsesd-site-nav");
		var $agencyAppsItem = $("<div />", {'class': 'o365cs-nav-topItem psesd-agency-apps'}).prependTo($topHeaderItems);
		var $agencyAppsButton = $("<button />", {'class': 'o365cs-nav-item o365cs-nav-button o365cs-navMenuButton ms-bgc-tdr-h o365button ms-bgc-tp', 'title': 'Agency Applications'}).appendTo($agencyAppsItem);
		var $agencyAppsIcon = $("<img />", {'src': '/SiteAssets/psesd-drop-white.png'}).appendTo($agencyAppsButton);
		var itemPosition = $agencyAppsItem.position();
		var itemHeight = $agencyAppsItem.height();
		$agencyAppsDropdown.css({'top': parseInt(itemHeight, 10)});
		$agencyAppsButton.click(function() {
			$agencyAppsDropdown.slideToggle(150);
			return false;
		});

		if (SP.Ribbon !== undefined && SP.Ribbon.PageState.Handlers.isInEditMode()) {
			return true;
		}
		if ($siteNav.find('li').length === 0) {
			$siteNav.remove();
		}
	});