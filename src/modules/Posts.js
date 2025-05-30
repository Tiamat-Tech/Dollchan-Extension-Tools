/* ==[ Posts.js ]=============================================================================================
                                                    POSTS
=========================================================================================================== */

class AbstractPost {
	constructor(thr, num, isOp) {
		this.isOp = isOp;
		this.kid = null;
		this.num = num;
		this.ref = new RefMap(this);
		this.thr = thr;
		this._hasEvents = false;
		this._linkTO = null;
		this._menu = null;
		this._menuTO = null;
	}
	get btnFav() {
		const value = $q('.de-btn-fav, .de-btn-fav-sel', this.btns);
		Object.defineProperty(this, 'btnFav', { value });
		return value;
	}
	get btnHide() {
		const value = this.btns.firstChild;
		Object.defineProperty(this, 'btnHide', { value });
		return value;
	}
	get images() {
		const value = new PostImages(this);
		Object.defineProperty(this, 'images', { value });
		return value;
	}
	get mp3Obj() {
		const value = $bBegin(this.msg, '<div class="de-mp3"></div>');
		Object.defineProperty(this, 'mp3Obj', { value });
		return value;
	}
	* refLinks() {
		const links = $Q('a', this.msg);
		for(let lNum, i = 0, len = links.length; i < len; ++i) {
			const link = links[i];
			const tc = link.textContent;
			if(tc[0] !== '>' || tc[1] !== '>' || !(lNum = parseInt(tc.substr(2), 10))) {
				continue;
			}
			yield [link, lNum];
		}
	}
	get msg() {
		const value = $q(aib.qPostMsg, this.el);
		Object.defineProperty(this, 'msg', { value, configurable: true });
		return value;
	}
	get trunc() {
		let value = null;
		const el = aib.qTrunc && $q(aib.qTrunc, this.el);
		if(el && /long|full comment|gekürzt|слишком|длинн|мног|полн/i.test(el.textContent)) {
			value = el;
		}
		Object.defineProperty(this, 'trunc', { value, configurable: true });
		return value;
	}
	get videos() {
		const value = Cfg.embedYTube ? new Videos(this) : null;
		Object.defineProperty(this, 'videos', { value });
		return value;
	}
	addFuncs() {
		RefMap.updateRefMap(this, true);
		embedAudioLinks(this);
	}
	handleEvent(e) {
		let temp;
		let el = nav.fixEventEl(e.target);
		const { type } = e;
		const isOutEvent = type === 'mouseout';
		const isPview = this instanceof Pview;

		// Click event
		if(type === 'click') {
			if(aib.handlePostClick) {
				aib.handlePostClick(this, el, e);
			}
			// Skip the click by wheel button
			switch(e.button) {
			case 0: break;
			case 1: e.stopPropagation();
				/* falls through */
			default: return;
			}
			// Hide the dropdown menu after the click on its option
			if(this._menu && el.classList.contains('de-menu-item')) {
				this._menu.removeMenu();
				this._menu = null;
			}
			// Handle click on links/images/videos
			switch(el.tagName.toLowerCase()) {
			case 'a':
				// Click on YouTube link - show/hide player or thumbnail
				if(el.classList.contains('de-video-link')) {
					this.videos.clickLink(el, Cfg.embedYTube);
					e.preventDefault();
					return;
				}
				// Check if the link is not an image container
				if((temp = el.firstElementChild)?.tagName.toLowerCase() !== 'img') {
					temp = el.parentNode;
					const text = el.textContent;
					if(temp === this.trunc) { // Click on "truncated message" link
						this._getFullMsg(temp, false);
						e.preventDefault();
						e.stopPropagation();
					} else if(Cfg.insertNum && postform.form && (this._pref === temp || this._pref === el) &&
						!/Reply|Ответ|№/.test(text)
					) { // Click on post number link - show quick reply or redirect with an #anchor
						e.preventDefault();
						e.stopPropagation();
						if(!Cfg.showRepBtn) {
							postform.getSelectedText();
							postform.showQuickReply(isPview ? Pview.topParent : this,
								this.num, !isPview, false);
							postform.quotedText = '';
						} else if(postform.isQuick || aib.t && postform.isHidden) {
							postform.showQuickReply(isPview ? Pview.topParent : this, this.num, false, true);
						} else if(aib.t) {
							const formText = postform.txta.value;
							const isOnNewLine = formText === '' || formText.slice(-1) === '\n';
							insertText(postform.txta, `>>${ this.num }${ isOnNewLine ? '\n' : '' }`);
						} else {
							deWindow.location.assign(el.href);
						}
					} else if(text === '№') {
						pByNum.get(+el.href.match(/#(\d+)/)[1])?.selectAndScrollTo();
					} else if(nav.isMobile) {
						break;
					} else if(text[0] === '>' && text[1] === '>' && !text[2].includes('/')) {
						// Click on >>link - scroll to the referenced post
						pByNum.get(+text.match(/\d+/))?.selectAndScrollTo();
					}
					return;
				}
				el = temp; // The link is an image container
				/* falls through */
			case 'img': // Click on attached image - expand/collapse
				if(el.classList.contains('de-video-thumb')) {
					if(Cfg.embedYTube === 1) {
						const { videos } = this;
						videos.currentLink.classList.add('de-current');
						videos.setPlayer(videos.playerInfo, el.classList.contains('de-ytube'));
						e.preventDefault();
					}
				} else if(Cfg.expandImgs !== 0) {
					this._clickImage(el, e);
				}
				return;
			case 'object':
			case 'video': // Click on attached video - expand/collapse
				if(Cfg.expandImgs !== 0 && !ExpandableImage.isControlClick(e)) {
					this._clickImage(el, e);
				}
				return;
			}
			// Click on post buttons
			switch(el.classList[0]) {
			case 'de-btn-expthr':
				if(nav.isMobile) {
					this._menuToggleClickBtn(el, arrTags(Lng.selExpandThr[lang],
						'<span class="de-menu-item" info="thr-exp">', '</span>'));
				} else {
					this.thr.loadPosts('all');
				}
				return;
			case 'de-btn-fav': this.thr.toggleFavState(true, isPview ? this : null); return;
			case 'de-btn-fav-sel': this.thr.toggleFavState(false, isPview ? this : null); return;
			case 'de-btn-hide':
			case 'de-btn-hide-user':
			case 'de-btn-unhide':
			case 'de-btn-unhide-user':
				if(nav.isMobile && Cfg.showHideBtn === 1) {
					this._menuToggleClickBtn(el,
						(this instanceof Pview ? pByNum.get(this.num) : this)._getMenuHide());
				} else {
					this.setUserVisib(!this.isHidden);
				}
				return;
			case 'de-btn-img':
				if(nav.isMobile) {
					this._menuToggleClickBtn(el, Menu.getMenuImg(el));
				} else {
					postform.quotedText = aib.getImgRealName(aib.getImgWrap(el));
					postform.showQuickReply(isPview ? Pview.topParent : this, this.num, !isPview, false);
				}
				return;
			case 'de-btn-reply':
				if(nav.isMobile && Cfg.showRepBtn === 1) {
					this._menuToggleClickBtn(el,
						(this instanceof Pview ? pByNum.get(this.num) : this)._getMenuReply());
				} else {
					postform.showQuickReply(isPview ? Pview.topParent : this, this.num, !isPview, false);
					postform.quotedText = '';
				}
				return;
			case 'de-btn-sage': /* await */ Spells.addSpell(9, '', false); return;
			case 'de-btn-stick': this.toggleSticky(true); return;
			case 'de-btn-stick-on': this.toggleSticky(false); return;
			// Mobile devices: Click on >>links - show/delete post previews
			default:
				if(!nav.isMobile || !Cfg.linksNavig || el.tagName.toLowerCase() !== 'a' || el.isNotRefLink) {
					return;
				}
				if(!el.textContent.startsWith('>>')) {
					el.isNotRefLink = true;
					return;
				}
				// Donʼt use classList here, 'de-link-postref ' should be first
				el.className = 'de-link-postref ' + el.className;
				/* falls through */
			case 'de-link-backref':
			case 'de-link-postref':
				if(!nav.isMobile || !Cfg.linksNavig) {
					return;
				}
				if(this.kid && this.kid.parent.num === this.num &&
					this.kid.num === +el.textContent.match(/\d+/g)?.[0]
				) {
					this.kid.deletePview();
				} else {
					this.kid = Pview.showPview(this, el);
				}
				e.preventDefault();
				e.stopPropagation();
			}
			return;
		}

		// Mouseover/mouseout events
		if(!this._hasEvents) {
			this._hasEvents = true;
			['click', 'mouseout'].forEach(e => this.el.addEventListener(e, this, true));
		}
		// Mouseover/mouseout on YouTube links
		if(Cfg.embedYTube === 2 && el.classList.contains('de-video-link')) {
			this.videos.toggleFloatedThumb(el, isOutEvent);
		}
		// Mouseover/mouseout on attached images/videos - update title
		if(!isOutEvent && Cfg.expandImgs &&
			el.tagName.toLowerCase() === 'img' && !el.classList.contains('de-fullimg') &&
			(temp = this.images.getImageByEl(el)) && (temp.isImage || temp.isVideo)
		) {
			el.title = Cfg.expandImgs === 1 ? Lng.expImgInline[lang] : Lng.expImgFull[lang];
		}
		// Mouseover/mouseout on post buttons - update title, add/delete dropdown menu
		switch(el.classList[0]) {
		case 'de-btn-expthr':
			this.btns.title = Lng.expandThr[lang];
			if(!nav.isMobile) {
				this._menuToggleOverBtn(el, isOutEvent, arrTags(Lng.selExpandThr[lang],
					'<span class="de-menu-item" info="thr-exp">', '</span>'));
			}
			return;
		case 'de-btn-fav': this.btns.title = Lng.addFav[lang]; return;
		case 'de-btn-fav-sel': this.btns.title = Lng.delFav[lang]; return;
		case 'de-btn-hide':
		case 'de-btn-hide-user':
		case 'de-btn-unhide':
		case 'de-btn-unhide-user':
			this.btns.title = this.isOp ? Lng.toggleThr[lang] : Lng.togglePost[lang];
			if(!nav.isMobile && Cfg.showHideBtn === 1) {
				this._menuToggleOverBtn(el, isOutEvent,
					(this instanceof Pview ? pByNum.get(this.num) : this)._getMenuHide());
			}
			return;
		case 'de-btn-img':
			if(!nav.isMobile && el.parentNode.className !== 'de-fullimg-info') {
				this._menuToggleOverBtn(el, isOutEvent, Menu.getMenuImg(el));
			}
			return;
		case 'de-btn-reply': {
			if(!nav.isMobile && Cfg.showRepBtn === 1) {
				if(!isOutEvent) {
					postform.getSelectedText();
				}
				this._menuToggleOverBtn(el, isOutEvent,
					(this instanceof Pview ? pByNum.get(this.num) : this)._getMenuReply());
			}
			return;
		}
		case 'de-btn-sage': this.btns.title = 'SAGE'; return;
		case 'de-btn-stick': this.btns.title = Lng.attachPview[lang]; return;
		case 'de-post-btns': el.removeAttribute('title'); return;
		// Mouseover/mouseout on >>links - show/delete post previews
		default:
			if(nav.isMobile || !Cfg.linksNavig || el.tagName.toLowerCase() !== 'a' || el.isNotRefLink) {
				return;
			}
			if(!el.textContent.startsWith('>>')) {
				el.isNotRefLink = true;
				return;
			}
			// Donʼt use classList here, 'de-link-postref ' should be first
			el.className = 'de-link-postref ' + el.className;
			/* falls through */
		case 'de-link-backref':
		case 'de-link-postref':
			if(!Cfg.linksNavig) {
				return;
			}
			if(isOutEvent) { // Mouseout - We need to delete previews
				clearTimeout(this._linkTO);
				if(!(aib.getPostOfEl(nav.fixEventEl(e.relatedTarget)) instanceof Pview) && Pview.top) {
					Pview.top.markToDel(); // If cursor is not over one of previews - delete all previews
				} else if(this.kid) {
					this.kid.markToDel(); // If cursor is over any preview - delete its kids
				}
			} else { // Mouseover - we need to show a preview for this link
				if(nav.isMobile) {
					return;
				}
				this._linkTO = setTimeout(() => (this.kid = Pview.showPview(this, el)), Cfg.linksOver);
			}
			e.preventDefault();
			e.stopPropagation();
		}
	}
	toggleFavBtn(isEnable) {
		const elClass = isEnable ? 'de-btn-fav-sel' : 'de-btn-fav';
		this.btnFav?.setAttribute('class', elClass);
		this.thr.btnFav?.setAttribute('class', elClass);
	}
	updateMsg(newMsg, sRunner) {
		let videoExt, videoLinks;
		if(Cfg.embedYTube) {
			videoExt = $q('.de-video-ext', this.msg);
			videoLinks = $Q(':not(.de-video-ext) > .de-video-link', this.msg);
		}
		this.msg.replaceWith(newMsg);
		Object.defineProperties(this, {
			msg   : { configurable: true, value: newMsg },
			trunc : { configurable: true, value: null }
		});
		Post.Сontent.removeTempData(this);
		if(Cfg.embedYTube) {
			this.videos.updatePost(videoLinks, $Q('a[href*="youtu"], a[href*="vimeo.com"]', newMsg), false);
			if(videoExt) {
				newMsg.append(videoExt);
			}
		}
		this.addFuncs();
		sRunner.runSpells(this);
		embedPostMsgImages(this.el);
		if(this.isHidden) {
			this.hideContent(this.isHidden);
		}
		closePopup('load-fullmsg');
	}
	changeMyMark(val) {
		this.el.classList.toggle('de-mypost', val);
		$Q(`[de-form] ${ aib.qPostMsg } a[href$="${ aib.anchor + this.num }"]`).forEach(el => {
			const post = aib.getPostOfEl(el);
			if(post.el !== this.el) {
				el.classList.toggle('de-ref-you', val);
				post.el.classList.toggle('de-mypost-reply', val);
			}
		});
	}

	_clickImage(el, e) {
		const image = this.images.getImageByEl(el);
		if(!image || (!image.isImage && !image.isVideo)) {
			return;
		}
		image.expandImg((Cfg.expandImgs === 1) ^ e.ctrlKey, e);
		e.preventDefault();
		e.stopPropagation();
	}
	async _downloadImageByLink(el, e) {
		e.preventDefault();
		$popup('file-loading', Lng.loading[lang], true);
		const url = el.href;
		const data = await ContentLoader.loadFileData(url, false);
		if(!data) {
			$popup('file-loading', Lng.cantLoad[lang] + ' URL: ' + url);
			return;
		}
		closePopup('file-loading');
		downloadBlob(new Blob([data], { type: getFileMime(url) }), el.getAttribute('download'));
	}
	_getFullMsg(truncEl, isInit) {
		if(aib.deleteTruncMsg) {
			aib.deleteTruncMsg(this, truncEl, isInit);
			return;
		}
		if(!isInit) {
			$popup('load-fullmsg', Lng.loading[lang], true);
		}
		ajaxLoad(aib.getThrUrl(aib.b, this.tNum)).then(form => {
			let sourceEl;
			const maybeSpells = new Maybe(SpellsRunner);
			if(this.isOp) {
				sourceEl = form;
			} else {
				const posts = $Q(aib.qPost, form);
				for(let i = 0, len = posts.length; i < len; ++i) {
					const post = posts[i];
					if(this.num === aib.getPNum(post)) {
						sourceEl = post;
						break;
					}
				}
			}
			if(sourceEl) {
				this.updateMsg(aib.fixHTML(doc.adoptNode($q(aib.qPostMsg, sourceEl))), maybeSpells.value);
				truncEl.remove();
			}
			if(maybeSpells.hasValue) {
				maybeSpells.value.endSpells();
			}
		}, Function.prototype);
	}
	_menuAdd(el, html) {
		return new Menu(el, html, (el, e) =>
			(this instanceof Pview ? pByNum.get(this.num) || this : this)._menuClickOnOptions(el, e), false);
	}
	async _menuClickOnOptions(el, e) {
		const isHide = !this.isHidden;
		const { num } = this;
		switch(el.getAttribute('info')) {
		case 'hide-sel': {
			let { startContainer: start, endContainer: end } = this._selRange;
			if(start.nodeType === 3) {
				start = start.parentNode;
			}
			if(end.nodeType === 3) {
				end = end.parentNode;
			}
			const inMsgSel = `${ aib.qPostMsg }, ${ aib.qPostMsg } *`;
			if((nav.matchesSelector(start, inMsgSel) && nav.matchesSelector(end, inMsgSel)) || (
				nav.matchesSelector(start, aib.qPostSubj) &&
				nav.matchesSelector(end, aib.qPostSubj)
			)) {
				if(this._selText.includes('\n')) {
					await Spells.addSpell(1 /* #exp */,
						`/${ escapeRegExp(this._selText).replace(/\r?\n/g, '\\n') }/`, false);
				} else {
					await Spells.addSpell(0 /* #words */, this._selText.toLowerCase(), false);
				}
			} else {
				dummy.innerHTML = '';
				dummy.append(this._selRange.cloneContents());
				await Spells.addSpell(2 /* #exph */,
					`/${ escapeRegExp(dummy.innerHTML.replace(/^<[^>]+>|<[^>]+>$/g, '')) }/`, false);
			}
			return;
		}
		case 'hide-name': await Spells.addSpell(6 /* #name */, this.posterName, false); return;
		case 'hide-trip': await Spells.addSpell(7 /* #trip */, this.posterTrip, false); return;
		case 'hide-uid': await Spells.addSpell(18 /* #uid */, this.posterUid, false); return;
		case 'hide-img': {
			const { weight: w, width: wi, height: h } = this.images.firstAttach;
			await Spells.addSpell(8 /* #img */, [0, [w, w], [wi, wi, h, h]], false);
			return;
		}
		case 'hide-imgn':
			await Spells.addSpell(3 /* #imgn */, `/${ escapeRegExp(this.images.firstAttach.name) }/`, false);
			return;
		case 'hide-ihash': {
			const hash = await ImagesHashStorage.getHash(this.images.firstAttach);
			if(hash !== -1) {
				await Spells.addSpell(4 /* #ihash */, hash, false);
			}
			return;
		}
		case 'hide-noimg': await Spells.addSpell(0x108 /* (#all & !#img) */, '', true); return;
		case 'hide-post': this.setUserVisib(!this.isHidden); break;
		case 'hide-text': {
			const words = Post.getWrds(this.text);
			for(let post = Thread.first.op; post; post = post.next) {
				Post.findSameText(num, !isHide, words, post);
			}
			return;
		}
		case 'hide-notext': await Spells.addSpell(0x10B /* (#all & !#tlen) */, '', true); return;
		case 'hide-refs':
			this.ref.toggleRef(isHide, true);
			this.setUserVisib(isHide);
			return;
		case 'hide-refsonly': await Spells.addSpell(0 /* #words */, '>>' + num, false); return;
		case 'img-load': this._downloadImageByLink(el, e); return;
		case 'post-markmy': {
			const isAdd = !MyPosts.has(num);
			if(isAdd) {
				MyPosts.set(num, this.thr.num);
			} else {
				MyPosts.removeStorage(num);
			}
			this.changeMyMark(isAdd);
			return;
		}
		case 'post-reply': {
			const isPview = this instanceof Pview;
			postform.showQuickReply(isPview ? Pview.topParent : this, num, !isPview, false);
			postform.quotedText = '';
			return;
		}
		case 'post-report': aib.reportForm(num, this.thr.num); return;
		case 'thr-exp': {
			const task = +el.textContent.match(/\d+/);
			this.thr.loadPosts(!task ? 'all' : task === 10 ? 'more' : task);
		}
		}
	}
	_menuShowOverBtn(el, html) {
		this._menu?.removeMenu();
		this._menu = this._menuAdd(el, html);
		this._menu.onremove = () => (this._menu = null);
	}
	_menuToggleClickBtn(el, html) {
		if(this._menu?.el && this._menu.parentEl === el) {
			this._menu.removeMenu();
			this._menu = null;
			return;
		}
		this._menu = this._menuAdd(el, html);
	}
	_menuToggleOverBtn(el, isOutEvent, html) {
		if(this._menu?.parentEl === el) {
			return;
		}
		if(isOutEvent) {
			clearTimeout(this._menuTO);
		} else {
			this._menuTO = setTimeout(() => this._menuShowOverBtn(el, html), Cfg.linksOver);
		}
	}
}

class Post extends AbstractPost {
	constructor(el, thr, num, count, isOp, prev) {
		super(thr, num, isOp);
		this.count = count;
		this.el = el;
		this.isDeleted = false;
		this.isHidden = false;
		this.isOmitted = false;
		this.isViewed = false;
		this.next = null;
		this.prev = prev;
		this.spellHidden = false;
		this.userToggled = false;
		this._selRange = null;
		this._selText = '';
		if(prev) {
			prev.next = this;
		}
		pByEl.set(el, this);
		pByNum.set(num, this);
		let isMyPost = MyPosts.has(num);
		if(isMyPost) {
			this.el.classList.add('de-mypost');
		} else if(localData && this.el.classList.contains('de-mypost')) {
			MyPosts.set(num, thr.num);
			isMyPost = true;
		}
		el.classList.add(isOp ? 'de-oppost' : 'de-reply');
		this.btns = $aEnd(this._pref = $q(aib.qPostRef, el),
			'<span class="de-post-btns">' + Post.getPostBtns(isOp, aib.t) +
			(this.sage ? '<svg class="de-btn-sage"><use xlink:href="#de-symbol-post-sage"/></svg>' : '') +
			(isOp ? '' : `<span class="de-post-counter">${ count + 1 }</span>`) +
			(isMyPost ? '<span class="de-post-counter-you">(You)</span>' : '') + '</span>');
		this.counterEl = isOp ? null : $q('.de-post-counter', this.btns);
		if(Cfg.expandTrunc && this.trunc) {
			this._getFullMsg(this.trunc, true);
		}
		el.addEventListener('mouseover', this, true);
	}
	static addMark(postEl, forced) {
		if(doc.hidden || forced) {
			if(!Post.hasNew) {
				Post.hasNew = true;
				doc.addEventListener('click', Post.clearMarks, true);
			}
			postEl.classList.add('de-new-post');
		} else {
			Post.clearMarks();
		}
	}
	static clearMarks() {
		if(Post.hasNew) {
			Post.hasNew = false;
			$Q('.de-new-post').forEach(el => el.classList.remove('de-new-post'));
			doc.removeEventListener('click', Post.clearMarks, true);
		}
	}
	static getPostBtns(isOp, noExpThr) {
		return '<svg class="de-btn-hide"><use class="de-btn-hide-use" xlink:href="#de-symbol-post-hide"/>' +
			'<use class="de-btn-unhide-use" xlink:href="#de-symbol-post-unhide"/></svg>' +
			'<svg class="de-btn-reply"><use xlink:href="#de-symbol-post-reply"/></svg>' + (isOp ?
			(noExpThr ? '' : '<svg class="de-btn-expthr"><use xlink:href="#de-symbol-post-expthr"/></svg>') +
				'<svg class="de-btn-fav"><use xlink:href="#de-symbol-post-fav"/></svg>' : '');
	}
	static findSameText(pNum, isHidden, words, curPost) {
		const curWords = Post.getWrds(curPost.text);
		const len = curWords.length;
		let i = words.length;
		const olen = i;
		let _olen = i;
		let n = 0;
		if(len < olen * 0.4 || len > olen * 3) {
			return;
		}
		while(i--) {
			if(olen > 6 && words[i].length < 3) {
				_olen--;
				continue;
			}
			let j = len;
			while(j--) {
				if(curWords[j] === words[i] || words[i].match(/>>\d+/) && curWords[j].match(/>>\d+/)) {
					n++;
				}
			}
		}
		if(n < _olen * 0.4 || len > _olen * 3) {
			return;
		}
		if(isHidden) {
			if(curPost.spellHidden) {
				Post.Note.reset();
			} else {
				curPost.setVisib(false);
			}
			if(curPost.userToggled) {
				HiddenPosts.removeStorage(curPost.num);
				curPost.userToggled = false;
			}
		} else {
			curPost.setUserVisib(true, true, 'similar to >>' + pNum);
		}
		return false;
	}
	static getWrds(text) {
		return text.replace(/\s+/g, ' ').replace(/[^a-zа-яё ]/ig, '').trim().substring(0, 800).split(' ');
	}
	static hideContent(headerEl, btnHide, isUser, isHide) {
		if(!isHide) {
			btnHide.setAttribute('class', isUser ? 'de-btn-hide-user' : 'de-btn-hide');
			$Q('.de-post-hiddencontent', headerEl.parentNode).forEach(
				el => el.classList.remove('de-post-hiddencontent'));
			return;
		}
		if(aib.t) {
			Thread.first.hiddenCount++;
		}
		btnHide.setAttribute('class', isUser ? 'de-btn-unhide-user' : 'de-btn-unhide');
		if(headerEl) {
			for(let el = headerEl.nextElementSibling; el; el = el.nextElementSibling) {
				el.classList.add('de-post-hiddencontent');
			}
		}
	}
	get banned() {
		const value = aib.getBanId(this.el);
		Object.defineProperty(this, 'banned', { value, writable: true });
		return value;
	}
	get bottom() {
		return (this.isOp && this.isHidden ? this.thr.el.previousElementSibling : this.el)
			.getBoundingClientRect().bottom;
	}
	get headerEl() {
		return new Post.Сontent(this).headerEl;
	}
	get html() {
		return new Post.Сontent(this).html;
	}
	get nextInThread() {
		const post = this.next;
		return !post || post.count === 0 ? null : post;
	}
	get nextNotDeleted() {
		let post = this.nextInThread;
		while(post?.isDeleted) {
			post = post.nextInThread;
		}
		return post;
	}
	get note() {
		const value = new Post.Note(this);
		Object.defineProperty(this, 'note', { value });
		return value;
	}
	get posterName() {
		return new Post.Сontent(this).posterName;
	}
	get posterTrip() {
		return new Post.Сontent(this).posterTrip;
	}
	get posterUid() {
		return new Post.Сontent(this).posterUid;
	}
	get sage() {
		const value = aib.getSage(this.el);
		Object.defineProperty(this, 'sage', { value });
		return value;
	}
	get subj() {
		return new Post.Сontent(this).subj;
	}
	get text() {
		return new Post.Сontent(this).text;
	}
	get title() {
		return new Post.Сontent(this).title;
	}
	get tNum() {
		return this.thr.num;
	}
	get top() {
		return (this.isOp && this.isHidden ? this.thr.el.previousElementSibling : this.el)
			.getBoundingClientRect().top;
	}
	get wrap() {
		return new Post.Сontent(this).wrap;
	}
	addFuncs() {
		super.addFuncs();
		if(isExpImg) {
			this.toggleImages(true, false);
		}
	}
	deleteCounter() {
		this.isDeleted = true;
		this.counterEl.textContent = Lng.deleted[lang];
		this.counterEl.classList.add('de-post-counter-deleted');
		this.el.classList.add('de-post-removed');
		this.wrap.classList.add('de-wrap-removed');
	}
	deletePost(isRemovePost) {
		if(isRemovePost) {
			this.wrap.remove();
			pByEl.delete(this.el);
			pByNum.delete(this.num);
			if(this.isHidden) {
				this.ref.unhideRef();
			}
			RefMap.updateRefMap(this, false);
			if((this.prev.next = this.next)) {
				this.next.prev = this.prev;
			}
			return;
		}
		this.deleteCounter();
		($q('input[type="checkbox"]', this.el) || {}).disabled = true;
	}
	getAdjacentVisPost(toUp) {
		let post = toUp ? this.prev : this.next;
		while(post) {
			if(post.thr.isHidden) {
				post = toUp ? post.thr.op.prev : post.thr.last.next;
			} else if(post.isHidden || post.isOmitted) {
				post = toUp ? post.prev : post.next;
			} else {
				return post;
			}
		}
		return null;
	}
	hideContent(needToHide) {
		if(this.isOp) {
			if(!aib.t) {
				$toggle(this.thr.el, !needToHide);
				$toggle(this.thr.btns, !needToHide);
			}
		} else {
			Post.hideContent(this.headerEl, this.btnHide, this.userToggled, needToHide);
		}
	}
	select() {
		if(this.isOp) {
			if(this.isHidden) {
				this.thr.el.previousElementSibling.classList.add('de-selected');
			}
			this.thr.el.classList.add('de-selected');
		} else {
			this.el.classList.add('de-selected');
		}
	}
	selectAndScrollTo(scrollNode = this.el) {
		scrollTo(0, deWindow.pageYOffset + scrollNode.getBoundingClientRect().top -
			Post.sizing.wHeight / 2 + scrollNode.clientHeight / 2);
		if(HotKeys.enabled) {
			if(HotKeys.cPost) {
				HotKeys.cPost.unselect();
			}
			HotKeys.cPost = this;
			HotKeys.lastPageOffset = deWindow.pageYOffset;
		} else {
			$q('.de-selected')?.unselect();
		}
		this.select();
	}
	setUserVisib(isHide, isSave = true, note = null) {
		this.userToggled = true;
		this.setVisib(isHide, note);
		if(this.isOp || this.isHidden === isHide) {
			const hideClass = isHide ? 'de-btn-unhide-user' : 'de-btn-hide-user';
			this.btnHide.setAttribute('class', hideClass);
			if(this.isOp) {
				this.thr.btnHide.setAttribute('class', hideClass);
			}
		}
		if(isSave) {
			const { num } = this;
			HiddenPosts.set(num, this.thr.num, isHide);
			if(this.isOp) {
				if(isHide) {
					HiddenThreads.set(num, num, this.title);
				} else {
					HiddenThreads.removeStorage(num);
				}
			}
			sendStorageEvent('__de-post', {
				hide   : isHide,
				brd    : aib.b,
				num,
				thrNum : this.thr.num,
				title  : this.isOp ? this.title : ''
			});
		}
		this.ref.toggleRef(isHide, false);
	}
	setVisib(isHide, note = null) {
		if(this.isHidden === isHide) {
			if(isHide && note) {
				this.note.set(note);
			}
			return;
		}
		if(this.isOp) {
			this.thr.isHidden = isHide;
		} else {
			if(Cfg.delHiddPost === 1 || Cfg.delHiddPost === 2) {
				this.wrap.classList.toggle('de-hidden', isHide);
			} else {
				this._pref.onmouseover = this._pref.onmouseout = !isHide ? null : e => {
					const yOffset = deWindow.pageYOffset;
					this.hideContent(e.type === 'mouseout');
					scrollTo(deWindow.pageXOffset, yOffset);
				};
			}
		}
		if(Cfg.strikeHidd) {
			setTimeout(() => this._strikePostNum(isHide), 50);
		}
		if(isHide) {
			this.note.set(note);
		} else {
			this.note.hideNote();
		}
		this.hideContent(this.isHidden = isHide);
	}
	spellHide(note) {
		this.spellHidden = true;
		if(!this.userToggled) {
			this.setVisib(true, note);
			this.ref.hideRef();
		}
	}
	spellUnhide() {
		this.spellHidden = false;
		if(!this.userToggled) {
			this.setVisib(false);
			this.ref.unhideRef();
		}
	}
	toggleImages(isExpand = !this.images.expanded, isExpandVideos = true) {
		for(const image of this.images) {
			if((image.isImage || isExpandVideos && image.isVideo) && (image.expanded ^ isExpand)) {
				if(isExpand) {
					image.expandImg(true, null);
				} else {
					image.collapseImg(null);
				}
			}
		}
	}
	unselect() {
		if(this.isOp) {
			$id('de-thr-hid-' + this.num)?.classList.remove('de-selected');
			this.thr.el.classList.remove('de-selected');
		} else {
			this.el.classList.remove('de-selected');
		}
	}

	_getMenuHide() {
		const item = name => `<span info="hide-${ name }" class="de-menu-item">${
			Lng.selHiderMenu[name][lang] }</span>`;
		const sel = deWindow.getSelection();
		const ssel = sel.toString().trim();
		if(ssel) {
			this._selText = ssel;
			this._selRange = sel.getRangeAt(0);
		}
		return `${ nav.isMobile ? `<span info="hide-post" class="de-menu-item">${
			this.isOp ? Lng.toggleThr[lang] : Lng.togglePost[lang] }</span>` : '' }${
			ssel ? item('sel') : '' }${
			this.posterName ? item('name') : '' }${
			this.posterTrip ? item('trip') : '' }${
			this.posterUid ? item('uid') : '' }${
			this.images.hasAttachments ? item('img') + item('imgn') + item('ihash') : item('noimg') }${
			this.text ? item('text') : item('notext') }${
			!Cfg.hideRefPsts && this.ref.hasMap ? item('refs') : '' }${
			item('refsonly') }`;
	}
	_getMenuReply() {
		return `<span class="de-menu-item" info="post-reply">${
			this.btns.title = this.isOp ? Lng.replyToThr[lang] : Lng.replyToPost[lang]
		}</span>` +
		(getCookies().atom_access === '1' ? `<a class="de-menu-item" target="_blank" href="/${
			aib.b }/imgboard.php?manage=&moderate=${ this.num }">${
			this.isOp ? Lng.moderateThread[lang] : Lng.moderatePost[lang] }</a>` : '') +
		(aib.reportForm ? `<span class="de-menu-item" info="post-report">${
			this.isOp ? Lng.reportThr[lang] : Lng.reportPost[lang] }</span>` : '') +
		(Cfg.markMyPosts || Cfg.markMyLinks ?
			`<span class="de-menu-item" info="post-markmy">${
				MyPosts.has(this.num) ? Lng.deleteMyPost[lang] : Lng.markMyPost[lang]
			}</span>` : '');
	}
	_strikePostNum(isHide) {
		const { num } = this;
		if(isHide) {
			Post.hiddenNums.add(+num);
		} else {
			Post.hiddenNums.delete(+num);
		}
		$Q(`[de-form] a[href$="${ aib.anchor + num }"]`).forEach(el => {
			el.classList.toggle('de-link-hid', isHide);
			if(Cfg.removeHidd && el.classList.contains('de-link-backref')) {
				const refMapEl = el.parentNode;
				if(isHide === !$q('.de-link-backref:not(.de-link-hid)', refMapEl)) {
					$toggle(refMapEl, !isHide);
				}
			}
		});
	}
}
Post.hasNew = false;
Post.hiddenNums = new Set();
Post.Сontent = class PostContent extends TemporaryContent {
	constructor(post) {
		super(post);
		if(this._isInited) {
			return;
		}
		this._isInited = true;
		this.el = post.el;
		this.post = post;
	}
	get headerEl() {
		const value = $q(aib.qPostHeader, this.el);
		Object.defineProperty(this, 'headerEl', { value });
		return value;
	}
	get html() {
		const value = this.el.outerHTML;
		Object.defineProperty(this, 'html', { value });
		return value;
	}
	get posterName() {
		const pName = $q(aib.qPostName, this.el);
		const value = pName ? pName.textContent.trim().replace(/\s/g, ' ') : '';
		Object.defineProperty(this, 'posterName', { value });
		return value;
	}
	get posterTrip() {
		const pTrip = $q(aib.qPostTrip, this.el);
		const value = pTrip ? pTrip.textContent : '';
		Object.defineProperty(this, 'posterTrip', { value });
		return value;
	}
	get posterUid() {
		const pUid = $q(aib.qPostUid, this.el);
		const value = pUid ? pUid.textContent : '';
		Object.defineProperty(this, 'qPostUid', { value });
		return value;
	}
	get subj() {
		const subj = $q(aib.qPostSubj, this.el);
		const value = subj ? subj.textContent : '';
		Object.defineProperty(this, 'subj', { value });
		return value;
	}
	get text() {
		const value = this.post.msg.innerHTML
			.replace(/<\/?(?:br|p|li)[^>]*?>/gi, '\n')
			.replace(/<[^>]+?>/g, '')
			.replaceAll('&gt;', '>')
			.replaceAll('&lt;', '<')
			.replaceAll('&nbsp;', '\u00A0').trim();
		Object.defineProperty(this, 'text', { value });
		return value;
	}
	get title() {
		const value = this.subj || this.text.substring(0, 85).replace(/\s+/g, ' ');
		Object.defineProperty(this, 'title', { value });
		return value;
	}
	get wrap() {
		const value = aib.getPostWrap(this.el, this.post.isOp);
		Object.defineProperty(this, 'wrap', { value });
		return value;
	}
};
Post.Note = class PostNote {
	constructor(post) {
		this.text = null;
		this._post = post;
		this.isHideThr = this._post.isOp && !aib.t; // Hide threads only on board
		if(!this.isHideThr) {
			// Create usual post note
			this._noteEl = this.textEl = $bEnd(post.btns, '<span class="de-post-note"></span>');
			return;
		}
		// Create a stub before the thread, that also hides thread by CSS
		this._noteEl = $bBegin(post.thr.el, `<div class="${ aib.cReply } de-thr-hid" id="de-thr-hid-${
			post.num }">${ Lng.hiddenThr[lang] }: <a href="#">№${ post.num }</a>
			<span class="de-thread-note"></span>
		</div>`);
		this._aEl = $q('a', this._noteEl);
		this.textEl = this._aEl.nextElementSibling;
	}
	hideNote() {
		if(this.isHideThr) {
			this._aEl.onmouseover = this._aEl.onmouseout = this._aEl.onclick = null;
		}
		$hide(this._noteEl);
	}
	reset() {
		this.text = null;
		if(this.isHideThr) {
			this.set(null);
		} else {
			this.hideNote();
		}
	}
	set(note) {
		this.text = note;
		let text;
		if(this.isHideThr) {
			this._aEl.onmouseover = this._aEl.onmouseout = e => this._post.hideContent(e.type === 'mouseout');
			this._aEl.onclick = e => {
				e.preventDefault();
				this._post.setUserVisib(!this._post.isHidden);
			};
			text = (this._post.title ? `(${ this._post.title }) ` : '') +
				(note ? `[autohide: ${ note }]` : '');
		} else {
			text = note ? `autohide: ${ note }` : '';
		}
		this.textEl.textContent = text;
		$show(this._noteEl);
	}
};
Post.sizing = {
	get dPxRatio() {
		const value = deWindow.devicePixelRatio || 1;
		Object.defineProperty(this, 'dPxRatio', { value });
		return value;
	},
	get wHeight() {
		const value = nav.viewportHeight();
		if(!this._enabled) {
			doc.defaultView.addEventListener('resize', this);
			this._enabled = true;
		}
		Object.defineProperties(this, {
			wHeight : { writable: true, configurable: true, value },
			wWidth  : { writable: true, configurable: true, value: nav.viewportWidth() }
		});
		return value;
	},
	get wWidth() {
		const value = nav.viewportWidth();
		if(!this._enabled) {
			doc.defaultView.addEventListener('resize', this);
			this._enabled = true;
		}
		Object.defineProperties(this, {
			wHeight : { writable: true, configurable: true, value: nav.viewportHeight() },
			wWidth  : { writable: true, configurable: true, value }
		});
		return value;
	},
	handleEvent() {
		this.wHeight = nav.viewportHeight();
		this.wWidth = nav.viewportWidth();
	},

	_enabled: false
};
