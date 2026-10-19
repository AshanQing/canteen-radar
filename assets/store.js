/* 食堂雷达 · 存储层：同一份代码，本地 / 联网两种模式 */
(function () {
  var CFG = window.FDR_CONFIG || {};
  var KEY_REVIEWS = "fdr_reviews_v2";
  var KEY_OUTBOX = "fdr_outbox_v1";
  var KEY_AUTHOR = "fdr_author_v1";
  var KEY_ROOM = "fdr_room_v1";
  var DEMO_WEIGHT = 3; // 一条真实点评按 3 票计入均分，让演示时数字看得见

  function read(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
    catch (e) { return d; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }
  function uid() {
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function param(name) {
    var m = (location.search || "").match(new RegExp("[?&]" + name + "=([^&]+)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function unb64(str) {
    var bin = atob(str), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  var room = CFG.room || param("room") || read(KEY_ROOM, "main");
  var apiBase = (CFG.apiBase || param("api") || "").replace(/\/$/, "");

  var Store = {
    mode: apiBase ? "remote" : "local",
    apiBase: apiBase,
    room: room,
    online: false,
    status: apiBase ? "连接中" : "本地模式",
    authorId: "",
    authorName: "",
    reviews: [],
    listeners: [],

    on: function (fn) { this.listeners.push(fn); },
    emit: function () { this.listeners.forEach(function (f) { f(); }); },

    init: function () {
      var me = read(KEY_AUTHOR, null);
      if (!me) {
        me = { id: "u" + Math.random().toString(36).slice(2, 8), name: "干饭人·" + Math.random().toString(36).slice(2, 6).toUpperCase() };
        write(KEY_AUTHOR, me);
      }
      this.authorId = me.id;
      this.authorName = me.name;
      write(KEY_ROOM, this.room);
      var self = this;
      return this.fetchAll().then(function (list) {
        self.reviews = list;
        self.flushOutbox();
        self.emit();
        return list;
      }).catch(function () {
        self.reviews = read(KEY_REVIEWS, []);
        self.status = "离线（本地保存）";
        self.emit();
        return self.reviews;
      });
    },

    setName: function (name) {
      this.authorName = name;
      var me = read(KEY_AUTHOR, {});
      me.name = name;
      write(KEY_AUTHOR, me);
      // 同步改掉自己历史评价的署名
      this.reviews.forEach(function (r) { if (r.authorId === Store.authorId) r.authorName = name; });
      this.cache();
      this.emit();
    },

    cache: function () { write(KEY_REVIEWS, this.reviews); },

    fetchAll: function () {
      var self = this;
      if (this.mode !== "remote") {
        this.status = "本地模式";
        return Promise.resolve(read(KEY_REVIEWS, []));
      }
      return fetch(this.apiBase + "/reviews?room=" + encodeURIComponent(this.room), { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status " + r.status);
          return r.json();
        })
        .then(function (data) {
          self.online = true;
          self.status = "已联网 · 房间 " + self.room;
          return (data && data.reviews) || [];
        });
    },

    byDish: function (dishId) {
      return this.reviews.filter(function (r) { return r.dishId === dishId; });
    },
    mine: function (dishId) {
      var mine = this.reviews.filter(function (r) {
        return r.authorId === Store.authorId && (!dishId || r.dishId === dishId);
      });
      return mine.length ? mine[mine.length - 1] : null;
    },
    picsOf: function (dishId) {
      var out = [];
      this.reviews.forEach(function (r) {
        if ((!dishId || r.dishId === dishId) && r.pics) out = out.concat(r.pics);
      });
      return out;
    },

    add: function (rev) {
      var self = this;
      var item = {
        id: uid(),
        room: this.room,
        dishId: rev.dishId,
        authorId: this.authorId,
        authorName: this.authorName,
        avatar: "🐼",
        flowers: rev.flowers,
        tags: rev.tags || [],
        text: rev.text || "",
        pics: rev.pics || [],
        createdAt: new Date().toISOString()
      };
      // 先本地落地（乐观更新），再尝试联网
      this.reviews.push(item);
      this.cache();
      this.emit();
      if (this.mode !== "remote") return Promise.resolve(item);
      return fetch(this.apiBase + "/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      }).then(function (r) {
        if (!r.ok) throw new Error("write failed");
        self.status = "已联网 · 已同步";
        return item;
      }).catch(function () {
        var out = read(KEY_OUTBOX, []);
        out.push(item);
        write(KEY_OUTBOX, out);
        self.status = "离线 · 待同步 " + out.length + " 条";
        return item;
      });
    },

    // 演示模式用：往本地池子里塞一条“别人的”评价
    addExternal: function (rev) {
      var item = {
        id: uid(),
        room: this.room,
        dishId: rev.dishId,
        authorId: rev.authorId || ("sim-" + Math.random().toString(36).slice(2, 6)),
        authorName: rev.authorName || "路过的同学",
        avatar: rev.avatar || "🐱",
        flowers: rev.flowers,
        tags: rev.tags || [],
        text: rev.text || "",
        pics: rev.pics || [],
        createdAt: new Date().toISOString()
      };
      this.reviews.push(item);
      this.cache();
      this.emit();
      return item;
    },

    flushOutbox: function () {
      var self = this;
      if (this.mode !== "remote" || !this.online) return;
      var out = read(KEY_OUTBOX, []);
      if (!out.length) return;
      out.forEach(function (item) {
        fetch(self.apiBase + "/reviews", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item)
        }).catch(function () {});
      });
      write(KEY_OUTBOX, []);
    },

    exportShare: function () {
      var payload = { v: 1, room: this.room, reviews: this.reviews };
      return b64(JSON.stringify(payload));
    },

    importShare: function (code) {
      var data = JSON.parse(unb64(code.trim()));
      if (!data || !data.reviews) throw new Error("bad code");
      var ids = {};
      this.reviews.forEach(function (r) { ids[r.id] = 1; });
      var added = 0;
      data.reviews.forEach(function (r) {
        if (!ids[r.id]) { Store.reviews.push(r); ids[r.id] = 1; added++; }
      });
      this.cache();
      this.emit();
      return added;
    },

    resetRoom: function () {
      this.reviews = [];
      this.cache();
      this.emit();
    }
  };

  window.Store = Store;
  window.FDR_DEMO_WEIGHT = DEMO_WEIGHT;
})();
