import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-scraper',
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, 
    DropdownModule],
  templateUrl: './scraper.component.html',
  styleUrl: './scraper.component.scss'
})
export class ScraperComponent {
  keyword = '';
  limit = 5;
  categorySlug = '';
  output = '';

  // Lista para mostrar resultados
  itemsList: Array<{
    image: string;
    name: string;
    originalPrice: number;
    calculatedPrice: number;
    revenue: number;
    link: string;
  }> = [];

  private categoryMap: Record<string, string> = {
    'toys-and-entertainment': '1f82f739-eb58-41fa-8016-219fe52a4d09',
    'home': '2caab52c-9626-4f40-8170-7ee4ff8a029f',
    'services': '39d47689-78f6-47cf-9d0d-61d392301492',
    'automotive': '4d53c511-c693-44ec-9030-756f8f12f751',
    'fashion': '6f51640f-a38d-4e98-b82a-27cc4b058585',
    'electronics': '999ad8a9-0dd6-4feb-83ca-8edb4d1aac1d',
    'health-and-beauty': 'e1ce3c27-d60b-4d5b-950a-ecccaeea4b91',
    'sports-and-outdoors': 'e559aa66-767e-4b64-94f4-9ca9d0cf5fc6',
    'pets': 'e86dfebb-d634-4726-a52a-5069f6063bbe',
    'food-and-drinks': 'eace1b94-8297-47fe-8862-aa4d4ea79054',
    'baby-kids': 'f85aefa9-0e31-4fe3-a354-948dbfc7721d',
    'office-stationery': '0699a16b-4fc9-462e-b540-9279cb2fe441'
  };

  categoryOptions = Object.entries(this.categoryMap).map(([value]) => ({ label: value, value }));

  private SELLER_ID = 'd59ea1a4-5841-4740-950a-fb501a46ebae';

  constructor(private http: HttpClient) {}

  async run() {
    if (!this.keyword.trim() || !this.categoryMap[this.categorySlug]) {
      this.output = '❗ Keyword faltante o slug inválido';
      return;
    }

    this.output = 'Procesando…';
    this.itemsList = [];

    try {
      const slugKeyword = this.keyword.trim().replace(/\s+/g, '-');
      const searchUrl = `/ml/${slugKeyword}`;
      const html = (await this.http.get(searchUrl, { responseType: 'text' }).toPromise()) ?? '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const elements = Array.from(doc.querySelectorAll('div.ui-search-result__wrapper')).slice(0, this.limit);

      const tuples: string[] = [];
      for (const el of elements) {
        const titleEl = el.querySelector('a.poly-component__title');
        const shipTxt = el.querySelector('div.poly-component__shipping span')?.textContent || '';
        if (!titleEl?.textContent || !/gratis/i.test(shipTxt)) continue;

        const name = titleEl.textContent.trim().replace(/'/g, "''");
        const link = titleEl.getAttribute('href') ?? '';
        const imgEl = el.querySelector('img');
        const image = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || '';
        const raw = parseInt(
          el.querySelector('div.poly-price__current span.andes-money-amount__fraction')
            ?.textContent?.replace(/\D/g, '') ?? '0',
          10
        ) || 0;

        let desc = '';
        /*if (link) {
          const detailHtml = await this.http.get(link, { responseType: 'text' }).toPromise() ?? '';
          const detailDoc = new DOMParser().parseFromString(detailHtml, 'text/html');
          desc = (detailDoc.querySelector('div.ui-pdp-description__content > p')?.textContent ?? '')
            .trim()
            .replace(/'/g, "''");
        }*/

        const calc = Math.ceil((raw * 1.2) / 100) * 100;
        const rev = calc - raw;

        // Guardar para tabla
        this.itemsList.push({ image, name, originalPrice: raw, calculatedPrice: calc, revenue: rev, link });

        const id = crypto.randomUUID();
        tuples.push(
          `('${id}','${this.SELLER_ID}','${this.categoryMap[this.categorySlug]}','${name}','${desc}',${calc},` +
          `'${image}',0,NOW(),NULL,NULL,NULL,NULL,9,1,'${link}',${raw},${rev},'3 Días',NULL)`
        );
      }

      if (!tuples.length) {
        this.output = 'No se encontraron productos con envío gratis.';
        return;
      }

      const header = 'INSERT INTO products (' +
        'id,seller_id,category_id,name,description,price,image,' +
        'is_featured,created_at,original_price,note,tags,stock,' +
        'priority,active,dropshipping_url,dropshipping_price,' +
        'revenue,max_delivery_time,custom_options' +
        ') VALUES';
      this.output = [header, ...tuples.map((t, i) => t + (i < tuples.length - 1 ? ',' : ' ;'))].join('\n');
    } catch (err: any) {
      this.output = `❌ Error: ${err.message || err}`;
    }
  }

  copyOutput() {
    navigator.clipboard.writeText(this.output);
  }

  openLink(url: string) {
    window.open(url, '_blank');
  }
}
