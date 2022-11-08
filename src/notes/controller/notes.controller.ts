import { Controller, Get, Post, Put, Delete, Body, Param, Res, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { NoteService } from '../service/notes.service'
import { Note } from '../entities/notes.entity'
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { CreateNote } from '../dto/createNote';
@Controller('notes')
@UseGuards(AuthenticationGuard)
export class NoteController {
  constructor(
    private readonly NoteService: NoteService,
  ) { }
  @Get(":id")
  getAllBookings(@Param("id",ParseIntPipe) id: number) {
    return this.NoteService.getListBookingByOrder(id)
  }
  @Post()
  createNote(@Body() note: CreateNote) {
    return this.NoteService.createNoteForOrder(note)
  }
  @Put(':id')
  updateNote(@Param('id', ParseIntPipe) id: number, @Body() note: any) {
    return this.NoteService.updateNoteForOrder(note, id)
  }
  @Put('/customer/:id')
  updateNoteForCustomer(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.NoteService.updateNoteForCustomer(id, body)
  }
  @Get('/detail/:id')
  detailNote(@Param('id', ParseIntPipe) id: number) {
    return this.NoteService.findNote(id)
  }
  @Delete('/:id')
  deleteNote(@Param('id', ParseIntPipe) id: number) {
    return this.NoteService.deleteNote(id)
  }
}
