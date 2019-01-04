# primo-explore-custom-requests
Customized item requests in Primo NUI

## Usage
**(Note: currently applies to alpha version; will likely change in v1.0)**

1. Install
`yarn add primo-explore-custom-requests --dev`
2. Add as an angular dependency
```js
let app = angular.module('viewCustom', [
  //... other dependencies
  'primoExploreCustomRequests',
]);
```
3. Add components to appropriate `prmAfter` components:
```js
app
  // 1. Inject in <prm-authentication-after> order to capture the login handler function, as well as using custom login functions for reading logged-in user data via PDS (TODO: will be factored out as own customization)
  .component('prmAuthenticationAfter', {
    template: `<primo-explore-custom-login></primo-explore-custom-login>`
  })
  // 2. Inject in the <prm-location-item-after> component of the DOM, which exists after each holding entry WITHIN a specific location.
  .component('prmLocationItemAfter', {
    template: `<primo-explore-custom-requests></primo-explore-custom-requests>`,
      // 2a. Use this trick to implement the customization as a SIBLING of the item details, as opposed to its CHILD. This is a not a requirement, but is strongly recommended;Otherwise, styling of injected components will not match the styling of the elements it intends to replace. Implementation is left to the user so that this customization does not completely 'hijack' the institution's usage of this component.
    controller: ['$element', function($element) {
      const ctrl = this;
      ctrl.$postLink = () => {
        const $target = $element.parent().query('div.md-list-item-text');
        const $el = $element.detach();
        $target.append($el);
        $element.addClass('layout-align-center-center layout-row');
      };
    }]
  })
  // 3. Inject into the <prm-location-items-after> template. This aspect of the customization has no visible effects, but does communicate with <primo-explore-custom-requests> and is vital for tracking changes to what item(s) are currently displayed on the screen.
  .component('prmLocationItemsAfter', {
    template: `
    <primo-explore-custom-requests-handler></primo-explore-custom-requests-handler>
    `
  })
```
4. Configure
```js
app
  .constant('primoExploreCustomRequestsConfig', {
    // ... my large configuration object
  })
```
See [configuration schema](#configuration-schema)

## Configuration Schema
|name|type|usage|
|---|---|---|
`links`| `Array`| List of keys that for conditionally rendered links.
`linkText` |`Object`| Key-value reference for text to display with custom links. Keys refer to `links`. Values are a `String`.
`linkGenerators` |`Object`| Key-value reference of functions used generate target urls for custom `links`. Keys refer to `links`. Value is a JavaScript function that takes named parameters `{ item, config }` as arguments. `item` refers to `$ctrl.item` from `<prm-location-items>` controller. `config` refers to the configuration object itelf. Functions should be pure and return a string for the url value.
`showLinks`|`Object`|  Key-value reference of functions used determine whether a custom link from `links` is rendered. Keys refer to `links`. Value is a JavaScript function that takes named parameters `{ user, item, config }` as arguments. `item` refers to `$ctrl.item` from `<prm-location-items>` controller. `config` refers to the configuration object itelf. Functions should be pure and return a string for the url value. `user` refers to an JavaScript POJO with `id` and `bor-status` parameters (currently only by default). Functions return a `boolean` which determines whether to show (`true`) or hide (`false`) a specific link.
`hideDefaults`| `Function` (optional) | Used to determine where to hide all the default, out-of-the-box request links for specific items within a location. Function takes the named parameters `{ items, config }` as arguments. `items` refers to the `Array` of items in `$ctrl.currLoc.items` from `<prm-location-items>`. Functions should be pure and returns an `Array` of `Boolean`s that correspond to each element in `items`. For example, to hide only the second default action of three items should return `[false, true, false]`. `config` refers to the configuration object itself.
`hideCustom`| `Function` (optional) | Used to determine where to hide all the custom request links for specific items within a location. Function takes the named parameters `{ items, config }` as arguments. `items` refers to the `Array` of items in `$ctrl.currLoc.items` from `<prm-location-items>`. Functions should be pure and return an `Array` of `Boolean`s that correspond to each element in `items`. For example, to hide only the second custom link of three items should return `[false, true, false]`. `config` refers to the configuration object itself.
| `values` | `Object` (optional) | Dictionary used for arbitrary data and utility functionst that may be used in other aspects of your configuration. It is for this reason that a `config` parameter is passed to all functions, so that reusable and testable logic can be referred to throughout the configuration. (e.g. `config.values.functions` can be used as a dictionary of functions with particularly complex logic, which can later be easily referred to for reuse and/or unit-testing).

### Example

```js
{
  links: ['ezborrow', 'ill'],
  linkGenerators: {
    ezborrow: ({ item, config }) => {
      const title = item.pnx.addata.btitle ? item.pnx.addata.btitle[0] : '';
      const author = item.pnx.addata.au ? item.pnx.addata.au[0] : '';
      const ti = encodeURIComponent(`ti=${title}`);
      const au = encodeURIComponent(`au=${author}`);
      return `${config.values.baseUrls.ezborrow}?query=${ti}+and+${au}`;
    },
    ill: ({ item, config }) => `${config.values.baseUrls.ill}?${item.delivery.GetIt2.link.match(/resolve?(.*)/)}`
  },
  linkText: {
    ezborrow: 'Request E-ZBorrow',
    ill: 'Request ILL',
  },
  showLinks: {
    ezborrow: ({ user, item, config }) => {
      const isBook = ['BOOK', 'BOOKS'].some(type => item.pnx.addata.ristype.indexOf(type) > -1);
      const borStatus = user && user['bor-status'];
      return isBook && config.values.authorizedStatuses.ezborrow.indexOf(borStatus) > -1;
    },
    ill: ({ user, item, config }) => {
      const ezborrow = config.showLinks.ezborrow({ user, item, config });
      return !ezborrow && config.valuaes.authorizedStatuses.ill.indexOf(borStatus) > -1
    },
  },
  hideDefault: ({ items, config }) => {
    const { checkAreItemsUnique, checkIsAvailable } = config.values.functions;

    const availabilityStatuses = items.map(checkIsAvailable);
    const itemsAreUnique = checkAreItemsUnique(items);
    const allUnavailable = availabilityStatuses.every(status => status === false);

    return availabilityStatuses.map(isAvailable => allUnavailable || (itemsAreUnique && !isAvailable));
  },
  hideCustom: ({ items, config }) => config.hideDefault({ items, config }).map(boolean => !boolean),
  values: {
    baseUrls: {
      ezborrow: 'http://dev.login.library.nyu.edu/ezborrow/nyu',
      ill: 'http://dev.ill.library.nyu.edu/illiad/illiad.dll/OpenURL',
    },
    authorizedStatuses: {
      ezborrow: ["50", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "65", "66", "80", "81", "82", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41"],
      ill: ["30", "31", "32", "34", "35", "37", "50", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "65", "66", "80", "81", "82"]
    },
    functions: {
      checkAreItemsUnique: items => items.some((item, _i, items) => item._additionalData.itemdescription !== items[0]._additionalData.itemdescription),
      checkIsAvailable: item => {
        const unavailablePatterns = [
          /Requested/g,
          /^\d{2}\/\d{2}\/\d{2}/g, // starts with dd/dd/dd
          'Requested',
          'Billed as Lost',
          'Claimed Returned',
          'In Processing',
          'In Transit',
          'On Hold',
          'Request ILL',
          'On Order',
        ];

        const hasPattern = (patterns, target) => patterns.some(str => target.match(new RegExp(str)));
        const [circulationStatus, ...otherStatusFields] = item.itemFields;
        return !hasPattern(unavailablePatterns, circulationStatus);
      }
    }
  },
}
```