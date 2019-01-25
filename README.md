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
  // 1. Inject in the <prm-location-item-after> component of the DOM, which exists after each holding entry WITHIN a specific location.
  .component('prmLocationItemAfter', {
    template: `<primo-explore-custom-requests></primo-explore-custom-requests>`,
      // 1a. Use this trick to implement the customization as a SIBLING of the item details, as opposed to its CHILD. Otherwise, styling of injected components will not match the styling of the elements it intends to replace. The CSS that has been included with the module will assume that this has been implemented.
    controller: ['$element', function($element) {
      const ctrl = this;
      ctrl.$postLink = () => {
        const $target = $element.parent().query('div.md-list-item-text');
        const $el = $element.detach();
        $target.append($el);
        $element.addClass('layout-row flex-sm-30 flex-xs-100');
      };
    }]
  })
  // 2. Optional: Inject the <primo-explore-custom-login> peer dependency in order to capture currently logged in user via PDS
  .component('prmAuthenticationAfter', {
    template: `<primo-explore-custom-login></primo-explore-custom-login>`
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

If using `<primo-explore-custom-login>`, be sure to configure this as well according to that module's documentation.

## Configuration Schema
|name|type|usage|
|---|---|---|
`buttonIds`| `Array`| List of keys that for conditionally rendered `buttons`.
`buttonGenerators` |`Object`| Key-value reference of functions used generate button properties for custom `buttons`.
`noButtonsText`|`String` (optional) | Message to show if no buttons were generated from `buttonGenerators`, the default buttons are hidden, and the PDS user API didn't fail. Default: `Request not available`.
`userFailureText`|`String` (optional) | Message to show if no buttons were generated from `buttonGenerators`. Default: `Request not available`.
`userLoadingText`|`String` (optional) | Message to show if no buttons were generated from `buttonGenerators`. Default: `Request not available`.
`hideDefaultRequests`| `Function` (optional) | Used to determine whether to hide any default, out-of-the-box request buttons for specific holdings within a location. Functions return an array of booleans. Default: hide none.
`showCustomRequests`| `Object` (optional) | Used to determine whether to show a specific custom request button for specific holdings within a location. Functions return an array of booleans. Default: shows all.
`values` | `Object` (optional) | Dictionary used for arbitrary data and utility functions that may be used in other aspects of your configuration.

### `config.buttonIds`

#### Example
```js
{
  buttons: ['login', 'ezborrow', 'ill', '{item.request.custom}']
}
```

### `config.buttonGenerators`

Keys refer to `buttonIds`.

Functions take the following named parameters via a POJO:
* `item`: `$ctrl.item` object from the `<prm-location-items>` controller
* `config`: The configuration object itself for internal references.

Functions should be pure and return an `Object` with the following schema:

* `label`: The button text
* `href`: Opens link in a new window when button is clicked.
* `action`: Performs custom JS, with access to angular's [`$injector`](https://docs.angularjs.org/api/auto/service/$injector) object.

```js
{
  label: `My button`
  href: `http://example.com`,
  action: ($injector) => $injector.get('$window').alert('The button was pushed!'),
}
```
For example:
```js
{
  buttonGenerators: {
    ezborrow: ({ item, config }) => {
      const title = item.pnx.addata.btitle ? item.pnx.addata.btitle[0] : '';
      const author = item.pnx.addata.au ? item.pnx.addata.au[0] : '';
      const ti = encodeURIComponent(`ti=${title}`);
      const au = encodeURIComponent(`au=${author}`);
      return {
        href: `${config.values.baseUrls.ezborrow}?query=${ti}+and+${au}`,
        label: 'Request E-ZBorrow',
      };
    },
    ill: ({ item, config }) => ({
      href: `${config.values.baseUrls.ill}?${item.delivery.GetIt2.link.match(/resolve?(.*)/)}`,
      label: 'Request ILL',
    }),
    login: () => ({
      label: 'Login to see request options',
      action: ($injector) => $injector.get('customLoginService').login(),
    }),
  },
}
```

### `config.hideDefaultRequests` (optional)

Determines whether to hide default buttons/text on a per-item basis. By default, hides none.

A function which takes the following named parameters via a POJO:
* `user`: `Object` representation of a PDS user as taken from the `primoExploreCustomLoginService`. `undefined` if when user is not logged in, or the optional peer dependency has not been installed. `null` if a user is logged in, but the PDS API fetch failed.
* `items`: the array of items in `$ctrl.currLoc.items` from the `<prm-location-items>` component.
* `config`: The configuration object itself for internal references.

Functions should have no side-effects and return an `Array` of `Boolean`s that correspond to each holding in `items`. For example, to hide the default request actions of only the second of three holdings, return `[false, true, false]`.

```js
hideDefaultRequests: ({ items, config, user }) => {
  if (user === undefined) {
    return items.map(() => true);
  }

  const { checkAreItemsUnique, checkIsAvailable } = config.values.functions;

  const availabilityStatuses = items.map(checkIsAvailable);
  const itemsAreUnique = checkAreItemsUnique(items);
  const allUnavailable = availabilityStatuses.every(status => status === false);

  return availabilityStatuses.map(isAvailable => allUnavailable || (itemsAreUnique && !isAvailable));
}
```

### `config.showCustomRequests` (optional)

Determines whether to show the *custom* buttons/text on a per-holding basis. By default, shows all.

Keys refer to `buttonIds`.

Each function takes the following named parameters via a POJO:
* `user`: `Object` representation of a PDS user as taken from the `primoExploreCustomLoginService`. `undefined` if when user is not logged in, or the optional peer dependency has not been installed. `null` if a user is logged in, but the PDS API fetch failed.
* `items`: An array of holdings data. `$ctrl.currLoc.items` from the `<prm-location-items>` component.
* `item`: Record data. `$ctrl.item` object from the `<prm-location-items>` component.
* `config`: The configuration object itself for internal references.

Functions should have no side-effects and return an `Array` of `Boolean`s that correspond to each element in `items`. For example, to show the custom request actions for only the second of three holdings, return `[false, true, false]`.

```js
showCustomRequests: {
  login: ({ user, items }) => items.map(() => user === undefined),
  afc: ({ item, items, config, user}) => {
    if (!user) return items.map(() => false);
    const afcEligible = config.values.authorizedStatuses.afc.indexOf(user['bor-status']) > -1;
    const isBAFCMainCollection = item.delivery.holding.some(({ subLocation, libraryCode}) => {
      return libraryCode === "BAFC" && subLocation === "Main Collection";
    });

    return items.map(() => afcEligible && isBAFCMainCollection);
  }
},
```

### `config.noButtonsText` (optional)

The text to show when no buttons are rendered. By default, renders `Request not available`

*Note*: Has access to custom backoffice values via `{backoffice.key.value}` syntax:
```js
{
  noButtonsText: '{item.request.blocked}',
}
```

### `config.userFailureText` (optional)

The text to show when no buttons are rendered. By default, renders `Unable to retrieve request options`

*Note*: Has access to custom backoffice values via `{backoffice.key.value}` syntax:
```js
{
  userFailureText: '{item.request.failure}',
}
```

### `config.userLoadingText` (optional)

The text to show when no buttons are rendered. By default, renders `Retrieving request options...`

*Note*: Has access to custom backoffice values via `{backoffice.key.value}` syntax:
```js
{
  userLoadingText: '{item.request.loading}',
}
```

### `config.values` (optional)

A dictionary of arbitrary functions and values to be referred to within your functions. This is useful for more complex logic that you may want to test against, or reuse in multiple functions.

### Styles

```scss
/* Imitates prm-service-button styles */
button[class*="custom-request-"] {
  padding: .5em .35em !important;
}

/* Automatically shrinks empties on large view, overriding flex-sm-30  */
@media not all and (max-width: 599px) {
  prm-location-item-after {
    flex: 0 0 auto !important;
  }
}

/* On the smaller views, restores flex-grow */
@media (max-width: 599px) {
  primo-explore-custom-requests {
    flex: 1 1 100%;
  }
}
```