export default {
  pdsUrl: "https://pdsdev.library.nyu.edu/pds",
  pdsUserInfo: {
    queryString: 'func=get-attribute&attribute=bor_info',
    selectors: ['id', 'bor-status'],
  },
};