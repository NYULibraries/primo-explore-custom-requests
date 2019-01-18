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
      // 1a. Use this trick to implement the customization as a SIBLING of the item details, as opposed to its CHILD. This is a not a requirement, but is strongly recommended. Otherwise, styling of injected components will not match the styling of the elements it intends to replace.
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
`showButtons`|`Object`|  Key-value reference of functions used determine whether a custom link from `buttons` is rendered.
|`noButtonsText`|`String` (optional) |Message to show if no buttons were generated from `buttonGenerators`. Default: `Request not available`.
`hideDefaultRequest`| `Function` (optional) | Used to determine whether to hide all the default, out-of-the-box request buttons for specific items within a location. Default: hide none.
`hideCustomRequest`| `Function` (optional) | Used to determine whether to hide all the custom request buttons for specific items within a location. Default: hide none.
| `values` | `Object` (optional) | Dictionary used for arbitrary data and utility functions that may be used in other aspects of your configuration.

### `config.buttonIds`

*Note*: Has access to custom backoffice values via `{backoffice.key.value}` syntax:
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

### `config.showButtons`

Keys refer to `buttonIds`. Values are pure functions which return a boolean.

Functions take the following named parameters via a POJO:
* `user`: `Object` representation of a PDS user as taken from the `primoExploreCustomLoginService`. `undefined` if when user is not logged in, or the optional peer dependency has not been installed. `null` if a user is logged in, but the PDS API fetch failed.
* `item`: Record data. `$ctrl.item` object from the `<prm-location-items>` component.
* `config`: The configuration object itself for internal references.


```js
{
  showButtons: {
    ezborrow: ({ user, item, config }) => {
      if (!user) return false;
      const isBook = ['BOOK', 'BOOKS'].some(type => item.pnx.addata.ristype.indexOf(type) > -1);
      return isBook && config.values.authorizedStatuses.ezborrow.indexOf(user['bor-status']) > -1;
    },
    ill: ({ user, item, config }) => {
      if (!user) return false;
      const ezborrow = config.showButtons.ezborrow({ user, item, config });
      return !ezborrow && config.values.authorizedStatuses.ill.indexOf(user['bor-status']) > -1;
    },
    login: ({ user }) => user !== undefined,
  }
}
```

### `config.noButtonsText` (optional)

The text to show when no buttons are rendered. By default, renders `Request not available`

*Note*: Has access to custom backoffice values via `{backoffice.key.value}` syntax:
```js
{
  noButtonsText: '{item.request.blocked}',
}
```
### `config.hideDefaultRequest` (optional)

Determines whether to hide default buttons/text on a per-item basis. By default, hides none.

A function which takes the following named parameters via a POJO:
* `user`: `Object` representation of a PDS user as taken from the `primoExploreCustomLoginService`. `undefined` if when user is not logged in, or the optional peer dependency has not been installed. `null` if a user is logged in, but the PDS API fetch failed.
* `items`: An array of holdings data. `$ctrl.currLoc.items` from the `<prm-location-items>` component.
* `item`: Record data. `$ctrl.item` object from the `<prm-location-items>` component.
* `config`: The configuration object itself for internal references.

Functions should be pure and returns an `Array` of `Boolean`s that correspond to each element in `items`. For example, to hide only the second default action of three items should return `[false, true, false]`.

```js
{
  hideDefaultRequest: ({ items, config, user }) => {
    if (user === undefined) {
      return items.map(() => true);
    }

    const { checkAreItemsUnique, checkIsAvailable } = config.values.functions;

    const availabilityStatuses = items.map(checkIsAvailable);
    const itemsAreUnique = checkAreItemsUnique(items);
    const allUnavailable = availabilityStatuses.every(status => status === false);

    return availabilityStatuses.map(isAvailable => allUnavailable || (itemsAreUnique && !isAvailable));
  },
}
```

### `config.hideCustomRequest` (optional)

Link `config.hideDefaultRequest`, except determines whether to hide the *custom* buttons/text on a per-item basis.

By default, hides none.

```js
{
  hideCustomRequest: props => props.config.hideDefaultRequest(props).map(boolean => !boolean)
}
```

### `config.values` (optional)

A dictionary of arbitrary values to be referred to within your functions. This is useful for more complex logic that you may want to test against, or reuse in multiple functions.
