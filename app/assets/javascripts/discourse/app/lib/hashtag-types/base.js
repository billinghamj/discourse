import { setOwner } from "@ember/application";
import { debounce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";
import { getHashtagTypeClasses } from "discourse/lib/hashtag-type-registry";

export default class HashtagTypeBase {
  // Store a list of IDs that are currently being loaded globally to make it
  // easier to batch requests for multiple types of hashtags
  static loadingIds = {};

  static async _load() {
    const data = HashtagTypeBase.loadingIds;
    HashtagTypeBase.loadingIds = {};

    let hasData = false;
    Object.keys(data).forEach((type) => {
      hasData ||= data[type].size > 0;
      data[type] = [...data[type]]; // Set to Array
    });

    if (!hasData) {
      return;
    }

    const hashtags = await ajax("/hashtags/by-ids", { data });
    const typeClasses = getHashtagTypeClasses();
    Object.entries(typeClasses).forEach(([type, typeClass]) =>
      hashtags[type]?.forEach((hashtag) => typeClass.onLoad(hashtag))
    );
  }

  constructor(owner) {
    setOwner(this, owner);
    this.loadedIds = new Set();
  }

  get type() {
    throw "not implemented";
  }

  get preloadedData() {
    throw "not implemented";
  }

  generatePreloadedCssClasses() {
    const cssClasses = [];
    this.preloadedData.forEach((model) => {
      this.loadedIds.add(model.id);
      cssClasses.push(this.generateColorCssClasses(model));
    });
    return cssClasses.flat();
  }

  generateColorCssClasses() {
    throw "not implemented";
  }

  generateIconHTML() {
    throw "not implemented";
  }

  isLoaded(id) {
    id = parseInt(id, 10);
    return this.loadedIds.has(id);
  }

  load(id) {
    id = parseInt(id, 10);
    if (!this.isLoaded(id)) {
      (HashtagTypeBase.loadingIds[this.type] ||= new Set()).add(id);
      debounce(HashtagTypeBase, HashtagTypeBase._load, 100, false);
    }
  }

  onLoad(hashtag) {
    const hashtagId = parseInt(hashtag.id, 10);
    if (!this.isLoaded(hashtagId)) {
      this.loadedIds.add(hashtagId);

      // Append the styles for the loaded hashtag to the CSS generated by the
      // `hashtag-css-generator` initializer for preloaded models
      document.querySelector("#hashtag-css-generator").innerHTML +=
        "\n" + this.generateColorCssClasses(hashtag).join("\n");
    }
  }
}
