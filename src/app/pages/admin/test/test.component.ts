import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ChipsModule } from 'primeng/chips';

@Component({
  selector: 'app-test',
  imports: [ChipsModule, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements OnInit {

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      tagsArray: [[]],           // valor interno: string[]
      tagsCsv: ['']              // valor “real”: string separada por comas
    });

    // Cada vez que cambie el array, actualiza la CSV
    this.form.get('tagsArray')!.valueChanges.subscribe((arr: string[]) => {
      this.form.get('tagsCsv')!.setValue(arr.join(','));
    });
  }

  onSubmit() {
    // enviarás this.form.value.tagsCsv
  }

}
